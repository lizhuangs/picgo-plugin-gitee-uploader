import picgo from 'picgo'
import { getIns } from './lib/octokit'
import { PluginConfig } from 'picgo/dist/utils/interfaces'
import { getNow, zip, unzip } from './lib/helper'
import { ImgType, PluginConfig as PlusConfig } from './lib/interface'
const PluginName = 'picgo-plugin-gitee-uploader'
const UploaderName = 'gitee'
function initOcto(ctx: picgo) {
  const options: PlusConfig = ctx.getConfig('picBed.' + UploaderName)
  if (!options) {
    throw new Error("Can't find gitee config:" + ('picBed.' + UploaderName))
  }
  const ins = getIns(options, ctx)
  return ins
}

function notic(showNotification: Function, title: string, body?: string) {
  showNotification({
    title: 'gitee: ' + title,
    body
  })
}

const SyncGithubMenu = {
  label: 'Sync gitee',
  async handle(ctx: picgo, { showNotification }) {
    const octokit = initOcto(ctx)
    notic(showNotification, 'Sync gitee...')
    const githubDataJson = await octokit.getDataJson().catch(e => {
      ctx.log.error(e)
      notic(showNotification, 'Error at load dataJson', e.message)
      throw e
    })
    const uploaded: ImgType[] = ctx.getConfig('uploaded')
    const localDataJson = {
      data: uploaded.filter(each => each.type === UploaderName).map(zip),
      lastSync: (ctx.getConfig(PluginName) || {}).lastSync
    }
    const { sha, lastSync, data } = githubDataJson
    if (localDataJson.lastSync > lastSync) {
      try {
        if (sha) {
          await octokit.updateDataJson({
            data: localDataJson,
            sha
          })
        } else {
          await octokit.createDataJson(localDataJson)
        }
      } catch (e) {
        ctx.log.error(e)
        notic(showNotification, 'Error at sync github', e.message)
        throw e
      }
    } else {
      const newUploaded = data
        .map(each => {
          const obj = unzip(each)
          return {
            ...obj,
            type: UploaderName,
            imgUrl: octokit.parseUrl(obj.fileName)
          }
        })
        .concat(uploaded.filter(each => each.type !== UploaderName))
      ctx.saveConfig({
        uploaded: newUploaded,
        [PluginName]: {
          lastSync
        }
      })
    }
    notic(showNotification, 'Sync successful', 'Succeed to sync gitee')
  }
}

const PullGithubMenu = {
  label: 'Pull gitee',
  handle: async (ctx: picgo, { showNotification }) => {
    const octokit = initOcto(ctx)
    notic(showNotification, 'Pull img from gitee...')
    try {
      const { tree } = await octokit.getPathTree()
      const imgList: ImgType[] = tree
        .filter(each => /\.(jpg|png|jpeg|gif)$/.test(each.path))
        .map(each => {
          const unzipImg = unzip({
            f: each.path,
            s: each.sha
          })
          return {
            ...unzipImg,
            type: UploaderName,
            imgUrl: octokit.parseUrl(each.path)
          }
        })
      const uploaded: ImgType[] = ctx
        .getConfig('uploaded')
        .filter(each => each.type !== UploaderName)
      uploaded.unshift(...imgList)
      ctx.saveConfig({
        uploaded,
        [PluginName]: {
          lastSync: getNow()
        }
      })
      notic(showNotification, 'Pull successful', 'Succeed to pull from gitee')
    } catch (e) {
      ctx.log.error(e)
      notic(showNotification, 'Error at pull from gitee', e.message)
    }
  }
}

const guiMenu = ctx => {
  return [SyncGithubMenu, PullGithubMenu]
}

const handle = async (ctx: picgo) => {
  let output = ctx.output
  const octokit = initOcto(ctx)
  const ret = []
  const len = output.length
  let index = 0
  async function up() {
    const img = output[index]
    if (index >= len) return
    if (!img) {
      index++
      return up()
    }
    return octokit
      .upload(img)
      .then(({ imgUrl, sha }) => {
        img.imgUrl = imgUrl
        img.sha = sha
        ret.push(img)
        index++
        return up()
      })
      .catch(e => {
        ctx.log.error(e)
        ctx.emit('notification', {
          title: 'gitee: 上传失败',
          body: e.message,
          text: ''
        })
        index++
        return up()
      })
  }
  await up()
  ctx.saveConfig({
    [PluginName]: {
      lastSync: getNow()
    }
  })
  ctx.output = ret
  return ctx
}

async function onRemove(files: ImgType[], { showNotification }) {
  // console.log('1111 =?', this)
  const rms = files.filter(each => each.type === UploaderName)
  if (rms.length === 0) return
  const self: picgo = this
  const ins = initOcto(self)
  const fail = []
  for (let i = 0; i < rms.length; i++) {
    const each = rms[i]
    await ins.removeFile(each).catch((e) => {
      self.log.error(e)
      fail.push(each)
    })
  }
  if (fail.length) {
    // 确保主线程已经把文件从data.json删掉
    const uploaded: ImgType[] = self.getConfig('uploaded')
    uploaded.unshift(...fail)
    self.saveConfig({
      uploaded,
      [PluginName]: {
        lastSync: getNow()
      }
    })
  }
  notic(
    showNotification,
    '删除提示',
    fail.length === 0 ? '成功同步删除' : `删除失败${fail.length}个`
  )
}

const config = (ctx: picgo): PluginConfig[] => {
  let userConfig = ctx.getConfig(`picBed.${UploaderName}`)
  if (!userConfig) {
    userConfig = {}
  }
  const conf = [
    {
      name: 'repo',
      type: 'input',
      default: userConfig.repo || '',
      required: true
    },
    {
      name: 'branch',
      type: 'input',
      default: userConfig.branch || 'master',
      required: false
    },
    {
      name: 'token',
      type: 'input',
      default: userConfig.password || '',
      required: true
    },
    {
      name: 'path',
      type: 'input',
      default: userConfig.path || '',
      required: false
    },
    {
      name: 'customPath',
      type: 'list',
      default: userConfig.customPath || '',
      required: false,
      choices: [
        {
          name: 'default',
          value: 'default'
        },
        {
          name: '年',
          value: 'year'
        },
        {
          name: '年季',
          value: 'yearQuarter'
        },
        {
          name: '年月',
          value: 'yearMonth'
        }]
    },
    {
      name: 'customUrl',
      type: 'input',
      default: userConfig.customUrl || '',
      required: false
    }
  ]
  return conf
}
const syncConfig = (ctx: picgo): PluginConfig[] => {
  let userConfig = ctx.getConfig(PluginName)
  if (!userConfig) {
    userConfig = {}
  }
  const conf = [
    {
      name: 'lastSync',
      type: 'input',
      default: userConfig.lastSync || '',
      required: false
    }
  ]
  return conf
}

export = (ctx: picgo) => {
  const register = () => {
    // const { gitee } = ctx.getConfig('picBed')
    // if (!gitee.token) return
    ctx.helper.uploader.register(UploaderName, { handle, config })
    ctx.on('remove', onRemove)
  }
  return {
    register,
    guiMenu, // <-- 在这里注册
    uploader: UploaderName,
    config: syncConfig
  }
}
