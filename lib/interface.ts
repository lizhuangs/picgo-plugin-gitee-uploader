export interface PluginConfig {
  username: string,
  password: string,
  client_id: string,
  client_secret: string,
  repo: string,
  branch?: string,
  path?: string,
  token: string,
  customUrl?: string
}

export type ImgType = {
  fileName: string;
  extname: string;
  imgUrl: string;
  width?: number;
  height?: number;
  type: string;
  id: string;
  sha?: string
}

export type ImgZipType = {
  f: string,
  s: string
}
