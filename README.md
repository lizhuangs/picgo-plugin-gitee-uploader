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
- token: gitee `access token`
- path: file path
- customUrl: used to insead of `https://raw.githubusercontent.com/:owner/:repo/:branch/:path/:filename`, eg: `${customUrl}/path/filename.jpg`

makesure the `customUrl` can access your `repo`

![](https://zwing.site/imgur/57566062-a7752000-73fa-11e9-99c1-e3a0562bc41d.png)

### Menu

- Sync gitee: Just sync `data.json` (use latest updated)
- Pull gitee: Pull all `img` info from gitee (**force** and **override** local `data.json`)
