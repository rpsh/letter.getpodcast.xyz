const fs = require('fs');
const path = require('path');
const md = require('meta-marked');
const { Feed } = require('feed');

const feedConfig = {
  title: '任听播客通讯',
  description:
    '任听播客通讯是一份~~双周~~（不定期）更新的邮件通讯，由 任平生、JW 分享他们这段时间听到有意思的播客内容。',
  id: 'https://letter.getpodcast.xyz/',
  link: 'https://letter.getpodcast.xyz/',
  language: 'zh-cn',
  image: 'https://letter.getpodcast.xyz/img/logo.png',
  favicon: 'https://letter.getpodcast.xyz/favicon.ico',
  copyright: 'getpodcast.xyz',
  updated: new Date(),
  generator: 'getpodcast.xyz',
  feedLinks: {
    atom: 'https://letter.getpodcast.xyz/feed.xml',
  },
};

function getVols() {
  const vols = {};

  const dir = fs.readdirSync('./letters');
  dir.forEach((item) => {
    if (/(sp\.)?\d+\.md$/i.test(item)) {
      const file = fs.readFileSync(path.join('./letters', item), 'utf8');
      const mdDate = md(file, {
        baseUrl: 'https://letter.getpodcast.xyz/',
      });
      const url = `https://letter.getpodcast.xyz/letters/${item.replace(
        /\.md$/,
        ''
      )}.html`;

      vols[+new Date(mdDate.meta.Date)] = {
        title: mdDate.meta.Title,
        id: url,
        link: url,
        date: mdDate.meta.Date,
        image: mdDate.meta.Poster
          ? `https://letter.getpodcast.xyz/img/vol_${item.replace(
              /\.md$/,
              ''
            )}_small.png`
          : 'https://letter.getpodcast.xyz/img/logo.png',
        description: mdDate.meta.Intro,
        read: mdDate.meta.Read,
        content: mdDate.meta.Intro + mdDate.html.replace(/^<h1\s.*<\/h1>/, ''),
      };
    }
  });

  // 按发布日期排序处理一下
  const orderedVols = Object.keys(vols)
    .sort()
    .reverse() // 时间倒序
    .reduce((obj, key) => {
      obj[key] = vols[key];
      return obj;
    }, {});
  return orderedVols;
}

function generateRSS(vols) {
  feedConfig.updated = vols[Object.keys(vols)[0]].date;
  const feed = new Feed(feedConfig);

  Object.keys(vols).forEach((key) => {
    feed.addItem(vols[key]);
  });

  return feed.rss2();
}

function start() {
  const vols = getVols();
  const rss = generateRSS(vols);
  fs.writeFileSync(`./feed/rss.xml`, rss, 'utf8');
}

start();
