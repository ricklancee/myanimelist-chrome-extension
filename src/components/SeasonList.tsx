import * as React from 'react'
import './SeasonList.css'
import AniApi, { Series } from '../support/AniApi'
import ScrollContainer from './ScrollContainer'
import Show from './Show'
import { get, groupBy, flatten, split, uniqBy } from 'lodash'

interface State {
  shows: Series[]
}

/**
 * Converts the date integer 20170630 from AniList to the dat string 2017-06-30
 * so we can use it properly.
 *
 * @param integer
 */
const crappyDateIntegerToDateString = (integer: number): string => {
  return split(String(integer), /(\d{4})(\d{2})(\d{2})/i).filter(v => v).join('-')
}

export default class SeasonList extends React.Component<{}, State> {

  private seasonalShows: Series[] = []

  private skip: number = 0
  private limit: number = 35

  constructor(props: {}) {
    super(props)

    const api = new AniApi

    this.state = {
      shows: []
    }

    // We explicitly check if the access token needs to be refreshed
    // if not each request will check it in the Promise.all
    // since they are run in parralel
    api.refreshAccessTokenIfNeeded().then(_ => {
      Promise.all([
        api.getShowsForSeason(this.getCurrentSeason()),
        api.getCurrentlyAiring()
      ]).then(([seasonal, airing]) => {
        const uniqueShows = uniqBy([...seasonal, ...airing], 'id').filter(({start_date_fuzzy}) => {
          // Filter out old shows; we still want to display shows that are still airing from a
          // fall 2016 > winter 2017 season change.
          return new Date(crappyDateIntegerToDateString(start_date_fuzzy as number)).getFullYear() > 2016
        })

        const groupedByType = groupBy(uniqueShows, 'type')

        this.seasonalShows = flatten(
          Object.keys(groupedByType)
            .sort(type => type === 'TV' || type === 'TV Short' ? -1 : 1)
            .map(item => groupedByType[item].sort((seriesA, seriesB) => {
              const dateA = get(seriesA, 'airing.time')
                || crappyDateIntegerToDateString(get(seriesA, 'start_date_fuzzy') as number)
              const dateB = get(seriesB, 'airing.time')
                || crappyDateIntegerToDateString(get(seriesB, 'start_date_fuzzy') as number)

              return new Date(dateA as string).getTime() - new Date(dateB as string).getTime()
            }))
        )

        console.log(this.seasonalShows)

        this.setState({
          shows: this.seasonalShows.slice(0, this.limit)
        })
      })
    })

    this.onLoadMore = this.onLoadMore.bind(this)
  }

  getCurrentSeason() {
    const seasons = {
      'winter': [0, 2],
      'spring': [3, 5],
      'summer': [6, 8],
      'fall': [9, 11]
    }

    const currentMonth = (new Date).getMonth()

    for (let season in seasons) {
      if (seasons.hasOwnProperty(season)) {
        const [from, to] = seasons[season]

        if (currentMonth >= from && currentMonth <= to) {
          return season as 'winter'|'spring'|'summer'|'fall'
        }
      }
    }

    throw new Error(`Month ${currentMonth} does not fall in the season object`)
  }

  onLoadMore(done: () => void) {
    this.skip = this.skip + this.limit

    if (this.skip >= this.seasonalShows.length) {
      done()
      return
    }

    this.setState({
      shows: [
        ...this.state.shows,
        ...this.seasonalShows.slice(this.skip, this.limit + this.skip)
      ]
    }, done)
  }

  render() {
    const { shows } = this.state

    return (
      <div className="SeasonList">
        <ScrollContainer onLoadMore={this.onLoadMore}>
          {shows.map(show => {
            return <li key={show.id}>
                <Show
                  title={show.title_romaji}
                  image={show.image_url_lge}
                  currentEpisode={0}
                  totalEpisodeCount={show.total_episodes}
                  status={
                    // If a show already has one episode make the status 'watching/green'
                    show.airing && show.airing.next_episode > 1 ? 1 : 6
                  }
                  id={show.id}
                  airing={show.airing ? {
                    nextEpisode: show.airing.next_episode,
                    airDate: new Date(show.airing.time)
                  } : undefined}
                />
              </li>
          })}
        </ScrollContainer>
      </div>
    )
  }
}
