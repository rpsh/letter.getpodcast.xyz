const fs = require('fs');
const path = require('path');

function getVols() {
  const vols = {};

  const dir = fs.readdirSync('./letters');
  dir.forEach((item) => {
    if (/(sp\.)?\d+\.md$/i.test(item)) {
      const file = fs.readFileSync(path.join('./letters', item), 'utf8');
      const lines = file.split('\n');

      vols[lines[3].replace(/\_/g, '')] = {
        title: lines[0].replace('# 任听播客通讯 ', ''),
        date: lines[3].replace(/\_/g, ''),
        desc: lines[1],
        path: `./letters/${item}`,
      };
    }
  });

  // 按发布日期排序处理一下
  const orderedVols = Object.keys(vols)
    .sort()
    .reduce((obj, key) => {
      obj[key] = vols[key];
      return obj;
    }, {});
  return orderedVols;
}

function generateReadmeMd(vols) {
  let mdText = `# 任听播客通讯
![任听播客通讯](https://i.loli.net/2019/05/26/5cea3ae146d2d43108.png)

任听播客通讯是一份<s>双周</s>（不定期）更新的邮件通讯，由 任平生、JW 分享他们这段时间听到有意思的播客内容。


## 往期内容

| 期数            | 发送日期      | 导语             |
| :------------- | :--------- | :---------------- |
`;

  Object.keys(vols).forEach((key) => {
    mdText += `| [${vols[key].title}](${vols[key].path}) | ${vols[key].date} | ${vols[key].desc} |\n`;
  });

  mdText += `

## 订阅任听播客通讯

- 邮件订阅： [https://letter.getpodcast.xyz/](https://letter.getpodcast.xyz/)
- 公众号订阅：
  ![](https://i.loli.net/2019/12/13/4SU2y7NWEgv5lwJ.jpg)


## 赞赏支持
赞赏时请备注你的Email

- 微信：
  ![](https://getpodcast.xyz/src/img/wx-zs.png)
- 支付宝：
  ![](https://getpodcast.xyz/src/img/zfb-zs.png)
- Paypal: renpingshengx@gmail.com

`;

  return mdText;
}

function start() {
  const vols = getVols();
  const mdText = generateReadmeMd(vols);
  fs.writeFileSync(`./Readme.md`, mdText, 'utf8');
}

start();
