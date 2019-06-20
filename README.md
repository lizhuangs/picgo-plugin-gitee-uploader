# picgo-plugin-gitee-uploader

plugin for [PicGo](https://github.com/Molunerfinn/PicGo)

- Sync `uploaded` with gitee use `data.json`
- Sync `remove` action
- Pull `img` info from gitee

**Don't edit `lastSync`**

## Usage

### Config

- repo: repo name, split by '/', eg: `owner/repoName`
- branch: default `master`
- token: gitee `personal access token`
- path: file path
- customPath: auto config path
- customUrl: used to insead of `https://gitee.com/:owner/:repo/raw/:path/:filename`, eg: `${customUrl}/path/filename.jpg`

makesure the `customUrl` can access your `repo`
#### customPath
自动配置path路径
示例：path：`blog/$customPath`
1. customPath选择年，则实际的path值为blog/2019
2. customPath选择年季，则实际的path值为blog/2019/summer
3. customPath选择年月，则实际的path值为blog/2019/01

`$customPath`为占位符。

### Menu

- Sync gitee: Just sync `data.json` (use latest updated)
- Pull gitee: Pull all `img` info from gitee (**force** and **override** local `data.json`)

### Thanks
this plugin base cloned from [picgo-plugin-github-plus](https://github.com/zWingz/picgo-plugin-github-plus) 
>picgo-plugin-github-plus 1.2.0已经支持gitee.