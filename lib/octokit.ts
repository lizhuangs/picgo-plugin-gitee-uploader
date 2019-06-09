import picgo from 'picgo'
import { getNow } from './helper'
import { PluginConfig, ImgType } from './interface'
import urlJoin from 'url-join'
import { ImgInfo } from 'picgo/dist/utils/interfaces'

export class Octo {
  username: string = ''
  password: string = ''
  clientId: string = ''
  clientSecret: string = ''
  owner: string = ''
  repo: string = ''
  branch: string = ''
  path: string = ''
  token: string = ''
  customUrl: string = ''
  ctx: picgo
  baseUrl = 'https://gitee.com/api/v5'
  constructor({
    repo,
    branch,
    path = '',
    token,
    customUrl = ''
  }: PluginConfig, ctx: picgo) {
    const [owner, r] = repo.split('/')
    if (!r) throw new Error('Error in repo name')
    this.owner = owner
    this.repo = r
    this.branch = branch || 'master'
    this.path = path
    this.token = token
    this.customUrl = customUrl
    this.ctx = ctx
  }

  async getTree(sha): Promise<{ path: string; sha: string }[]> {
    const url = urlJoin(
      this.baseUrl,
      'repos',
      this.owner,
      this.repo,
      'git/gitee/trees',
      sha
    )
    // this.ctx.log.info('url:' + url)
    let params = {
      method: 'GET',
      json: true,
      resolveWithFullResponse: true,
      url: url,
      qs: {
        access_token: this.token
      }
    }
    let result = await this.ctx.Request.request(params)
    // this.ctx.log.info('getTree result')
    // this.ctx.log.info(JSON.stringify(result.body))
    if (result && result.statusCode === 200) {
      const { tree } = result.body
      return tree
    } else {
      this.ctx.log.error('getTree error')
      this.ctx.log.error(JSON.stringify(result))
      throw result
    }
  }
  async getPathTree(): Promise<{ sha: string; tree: any[] }> {
    const { path } = this
    let tree = await this.getTree(this.branch)
    const arr = path.split('/').filter(each => each)
    let sha = this.branch
    for (let i = 0; i < arr.length; i++) {
      const item = tree.filter(each => arr[i].endsWith(each.path))[0]
      if (!item) return Promise.reject(new Error(`Can\'t find ${path}`))
      sha = item.sha
      tree = await this.getTree(sha)
    }
    return { sha, tree }
  }
  async getDataJson(): Promise<{ lastSync: string, data: any[], sha?: string }> {
    const defaultRet = {
      lastSync: '',
      data: []
    }
    const { tree } = await this.getPathTree()
    /* this.ctx.log.info('tree info')
    tree.forEach(element => {
      this.ctx.log.info(JSON.stringify(element))
    }) */
    const dataJson = tree.filter(each => each.path === 'data.json')[0]
    // this.ctx.log.info('dataJson info')
    // this.ctx.log.info(JSON.stringify(dataJson))
    if (dataJson) {
      const url = urlJoin(
        this.baseUrl,
        'repos',
        this.owner,
        this.repo,
        'git/blobs',
        dataJson.sha
      )
      // this.ctx.log.info('url:' + url)
      const params = {
        method: 'GET',
        json: true,
        resolveWithFullResponse: true,
        url: url,
        qs: {
          access_token: this.token
        }
      }
      let result = await this.ctx.Request.request(params)
      // this.ctx.log.info('getBlob result')
      // this.ctx.log.info(JSON.stringify(result.body))
      if (result && result.statusCode === 200) {
        const buf = Buffer.from(result.body.content, result.body.encoding)
        const json = JSON.parse(buf.toString())
        return {
          ...defaultRet,
          ...json,
          sha: dataJson.sha
        }
      } else {
        this.ctx.log.error('getBlob error')
        this.ctx.log.error(JSON.stringify(result))
        throw result
      }
    }
    return defaultRet
  }
  async updateDataJson({ data, sha }) {
    const fileName = 'data.json'
    const url = this.fileOptions(fileName)
    // this.ctx.log.info('updateDataJson url:' + url)
    const params = this.uploadOptions(url, 'PUT',
      Buffer.from(JSON.stringify(data)).toString('base64'),
      `Sync dataJson by PicGo at ${getNow()}`)
    params.formData['sha'] = sha
    // this.ctx.log.info(JSON.stringify(params))
    let result = await this.ctx.Request.request(params)
    // this.ctx.log.info('sync update data.json')
    // this.ctx.log.info(JSON.stringify(result))
    if (result && result.statusCode === 200) {
      return true
    } else {
      this.ctx.log.error('sync update data.json error')
      this.ctx.log.error(JSON.stringify(result))
      throw result
    }
  }
  async createDataJson(data) {
    const fileName = 'data.json'
    const url = this.fileOptions(fileName)
    // this.ctx.log.info('createDataJson url:' + url)
    const params = this.uploadOptions(url, 'POST',
      Buffer.from(JSON.stringify(data)).toString('base64'),
      `Sync dataJson by PicGo at ${getNow()}`)
    let result = await this.ctx.Request.request(params)
    /* this.ctx.log.info('sync data.json')
    this.ctx.log.info(JSON.stringify(result)) */
    if (result && result.statusCode === 201) {
      return true
    } else {
      this.ctx.log.error('sync data.json error')
      this.ctx.log.error(JSON.stringify(result))
      throw result
    }
  }

  async upload(img: ImgInfo) {
    // 取出对象中同名的属性并赋值，神奇的写法，可以取出多个
    const { fileName } = img
    const url = this.fileOptions(fileName)
    // this.ctx.log.info('url:' + url)
    const params = this.uploadOptions(url, 'POST',
      img.base64Image || Buffer.from(img.buffer).toString('base64'),
      `Upload ${fileName} by picGo - ${getNow()}`);
    let result = await this.ctx.Request.request(params)
    /* this.ctx.log.info('upload result')
    this.ctx.log.info(JSON.stringify(result)) */
    if (result && result.statusCode === 201) {
      return {
        imgUrl: result.body.content.download_url,
        sha: result.body.content.sha
      }
    } else {
      this.ctx.log.error('upload error')
      this.ctx.log.error(JSON.stringify(result))
      throw result
    }
  }
  async removeFile(img: ImgType) {
    const ctx = this.ctx
    const url = this.fileOptions(img.fileName)
    const params = {
      method: 'DELETE',
      json: true,
      resolveWithFullResponse: true,
      url: url,
      qs: {
        access_token: this.token,
        sha: img.sha,
        message: `Deleted ${img.fileName} by picGo - ${getNow()}`,
        branch: this.branch
      }
    }
    let result = await this.ctx.Request.request(params)
    /* this.ctx.log.info('Deleted result')
    this.ctx.log.info(JSON.stringify(result)) */
    if (result && result.statusCode === 200) {
      return true
    } else {
      this.ctx.log.error('deleted error')
      this.ctx.log.error(JSON.stringify(result))
      return result
    }
  }

  uploadOptions = function (url, method, content, msg) {
    return {
      method: method,
      json: true,
      resolveWithFullResponse: true,
      url: url,
      formData: {
        access_token: this.token,
        content: content,
        message: msg,
        branch: this.branch
      }
    }
  }

  fileOptions = function (fileName) {
    // ${encodeURI(options.path)}
    return urlJoin(
      this.baseUrl,
      'repos',
      this.owner,
      this.repo,
      'contents',
      this.path,
      fileName
    )
  }

  parseUrl(fileName) {
    const { owner, repo, path, customUrl, branch } = this
    if (customUrl) {
      return urlJoin(customUrl, path, fileName)
    }
    return urlJoin(
      `https://gitee.com/`,
      owner,
      repo,
      'raw',
      branch,
      path,
      fileName
    )
  }
}

let ins: Octo = null
let _cacheOption: string = ''
export function getIns(config: PluginConfig, ctx: picgo): Octo {
  const str = JSON.stringify(config)
  if (ins && _cacheOption === str) return ins
  _cacheOption = str
  ins = new Octo(config, ctx)
  return ins
}

/* istanbul ignore next */
export function clearIns() {
  // just for test
  ins = null
}
