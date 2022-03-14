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
    .reverse() // 时间倒序
    .reduce((obj, key) => {
      obj[key] = vols[key];
      return obj;
    }, {});
  return orderedVols;
}

function generateReadmeMd(vols) {
  let mdText = fs.readFileSync('./src/template/readme/header.md', 'utf8');

  Object.keys(vols).forEach((key) => {
    mdText += `| [${vols[key].title}](${vols[key].path}) | ${vols[key].date} | ${vols[key].desc} |\n`;
  });

  mdText += fs.readFileSync('./src/template/readme/footer.md', 'utf8');

  return mdText;
}

function start() {
  const vols = getVols();
  const mdText = generateReadmeMd(vols);
  fs.writeFileSync(`./Readme.md`, mdText, 'utf8');
}

start();
