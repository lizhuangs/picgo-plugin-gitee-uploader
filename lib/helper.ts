import dayjs from 'dayjs'
import { ImgType, ImgZipType } from './interface'
import slash from 'normalize-path'
import { join } from 'path'

export function getNow() {
  return dayjs().format('YYYY-MM-DD hh:mm:ss')
}

export function zip(img: ImgType): ImgZipType {
  return {
    f: img.fileName,
    s: img.sha
  }
}

export function unzip(img: ImgZipType): ImgType {
  const { f: fileName, s } = img
  const extname = fileName.split('.').slice(-1)[0]
  return {
    fileName,
    id: s,
    sha: s,
    extname,
    imgUrl: '',
    type: ''
  }
}

export function pathJoin(...arg) {
  return slash(join.apply(null, arg))
}

export function getPath(path: string, customPath: string) {
  if (customPath === '') {
    return path
  } else {
    let date = new Date()
    let year = date.getFullYear()
    let month = (date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1)
    if (customPath === 'year') {
      return path.replace('$customPath', year + '')
    } else if (customPath === 'yearQuarter') {
      let quarter = 'spring'
      if (month >= 4 && month <= 6) {
        quarter = 'summer'
      } else if (month >= 7 && month <= 9) {
        quarter = 'autumn'
      } else if (month >= 10 && month <= 12) {
        quarter = 'winter'
      }
      return path.replace('$customPath', year + '/' + quarter)
    } else if (customPath === 'yearMonth') {
      return path.replace('$customPath', year + '/' + month)
    } else {
      return path
    }
  }
}
