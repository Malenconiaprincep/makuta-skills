# WeChat API Reference (Draft Publishing)

## 1) Get Access Token

- Method: `GET`
- Endpoint:
  - `https://api.weixin.qq.com/cgi-bin/token`
- Query params:
  - `grant_type=client_credential`
  - `appid=<APPID>`
  - `secret=<APPSECRET>`

Success response example:

```json
{
  "access_token": "ACCESS_TOKEN",
  "expires_in": 7200
}
```

## 2) Add Draft

- Method: `POST`
- Endpoint:
  - `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=<ACCESS_TOKEN>`
- Body:

```json
{
  "articles": [
    {
      "title": "标题",
      "author": "作者",
      "digest": "摘要",
      "content": "<h1>HTML内容</h1>",
      "content_source_url": "https://example.com",
      "thumb_media_id": "THUMB_MEDIA_ID",
      "need_open_comment": 0,
      "only_fans_can_comment": 0
    }
  ]
}
```

Success response example:

```json
{
  "errcode": 0,
  "errmsg": "ok",
  "media_id": "DRAFT_MEDIA_ID"
}
```

## Error Handling Guide

- If token request fails, check `appid/appsecret` and account API permissions.
- If draft add fails:
  - verify `thumb_media_id` validity and ownership
  - verify `content` is valid HTML
  - inspect returned `errcode` and `errmsg`

## Practical Constraints

- `content` should be HTML, not raw Markdown.
- Token expires in about 7200s; request token before publishing.
- For images inside content, ensure they are hosted in reachable locations or handled according to WeChat content rules.
