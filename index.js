const fs = require('fs');
const path = require('path');

const yargs = require('yargs');
const inlineCss = require('inline-css');
const minify = require('html-minifier').minify;
const Mustache = require('mustache');

const datebase = require('./src/datebase.json');

const argv = yargs.argv;
const volNum = argv.v || argv.vol || argv._[0];

if (!volNum) {
  console.error('缺少 vol 号\n示例： node index.js -v=001');
  process.exit(1);
}

const template = {
  letter: {
    css: fs.readFileSync('./src/letter.css', 'utf8'),
    ...getTemplates('letter'),
  },
  mp: {
    css: fs.readFileSync('./src/mp.css', 'utf8'),
    ...getTemplates('mp'),
  },
};

function getTemplates(type) {
  const dir = path.join(__dirname, `./src/template/${type}`);
  const dirs = fs.readdirSync(dir);
  const template = {};

  dirs.forEach((fileName) => {
    if (path.extname(fileName) === '.html') {
      const file = fs.readFileSync(path.join(dir, fileName), 'utf8');
      template[path.basename(fileName, '.html')] = file;
    }
  });

  return template;
}

function getFile(volNum) {
  const fileName = path.join(__dirname, './letters/' + volNum + '.md');
  const file = fs.readFileSync(fileName, 'utf8');
  return file;
}

function mdToHtml(options) {
  const data = parseMd(options);

  return {
    letter: generateHtml({ type: 'letter', data }),
    mp: generateHtml({ type: 'mp', data }),
  };
}

function parseMd(options) {
  const { md = '', volNum } = options;
  const mdLines = md.split('\n');
  let flag = 0;

  const data = {
    header: {
      volNum,
    },
    feature: {
      index: '01',
      items: [],
    },
    roam: {
      index: '02',
      items: [],
    },
    newbie: {
      index: '03',
      items: [],
    },
  };

  mdLines.forEach((item, index) => {
    if (/^#\s/.test(item) && flag === 0) {
      flag = 'header';
      data.header.title = item.replace(/^#\s/, '');
    } else if (index === 1) {
      data.header.desc = item.replace(/\\$/, '');
    } else if (index === 2) {
      data.header.readTime = item.replace(/\_/g, '');
    } else if (/^##\s/.test(item) && flag === 'header') {
      flag = 'feature';
      data.feature.title = item.replace(/^##\s/, '');
    } else if (/^###\s/.test(item) && flag === 'feature') {
      data.feature.items.push({
        title: item.replace(/^###\s/, ''),
      });
    } else if (item && !/^[#|*|-|\s]/.test(item) && flag === 'feature') {
      const featureItem = data.feature.items[data.feature.items.length - 1];
      if (featureItem.intro) {
        featureItem.intro += '<br/>' + formatLink(item);
      } else {
        featureItem.intro = formatLink(item);
      }
    } else if (/^####\s/.test(item) && flag === 'feature') {
      const featureItem = data.feature.items[data.feature.items.length - 1];
      const title = item.match(/\[(.*)\]/)[1];
      if (!featureItem.author) {
        featureItem.author = [];
      }
      featureItem.author.push({
        name: title,
        rss: item.match(/\((.*)\)/)[1],
        desc: item.match(/\_([^_]*)\_/) && item.match(/\_([^_]*)\_/)[1],
        logo: datebase[title] && datebase[title].logo,
        pic: datebase[title] && datebase[title].pic,
      });
    } else if (/^##\s/.test(item) && flag === 'feature') {
      flag = 'roam';
      data.roam.title = item.replace(/^##\s/, '');
    } else if (/^\*\s/.test(item) && flag === 'roam') {
      data.roam.items.push({
        title:
          (item.match(/\*\s([^_]*)\_/) && item.match(/\*\s([^_]*)\_/)[1]) ||
          item.replace(/^\*\s/, ''),
        intro: (item.match(/\_([^_]*)\_/) && item.match(/\_([^_]*)\_/)[1]) || '',
      });
    } else if (/^\s\s####/.test(item) && flag === 'roam') {
      const roamItem = data.roam.items[data.roam.items.length - 1];
      roamItem.author = {
        name: item.match(/\[(.*)\]/)[1],
        rss: item.match(/\((.*)\)/)[1],
      };
    } else if (/^##\s/.test(item) && flag === 'roam') {
      flag = 'newbie';
      data.newbie.title = item.replace(/^##\s/, '');
    } else if (/^\*\s/.test(item) && flag === 'newbie') {
      data.newbie.items.push({
        title: item.match(/\*\s([^_]*)\_/)[1],
        intro: item.match(/\_([^_]*)\_/)[1],
      });
    } else if (/^\s\s/.test(item) && flag === 'newbie') {
      data.newbie.items[data.newbie.items.length - 1].rss = item.replace(/^\s\s/, '');
    }
  });

  return data;
}

function generateHtml(options) {
  const { type, data } = options;
  const gap =
    type === 'mp' ? `<p class="gap_line"><span>.</span></p>` : '<div class="gap_line"></div>';

  let html = `<style>${template[type].css}</style>`;
  html += `<div class="content">`;
  html += Mustache.render(template[type].header, data.header);
  html += Mustache.render(template[type].feature, data.feature);
  html += gap;
  html += Mustache.render(template[type].roam, data.roam);
  html += gap;
  html += Mustache.render(template[type].newbie, data.newbie);
  html += gap;
  if (type === 'mp') {
    html += template[type].ad;
    html += gap;
    html += Mustache.render(template[type].shortcut, { index: '04' });
    html += gap;
  }
  html += Mustache.render(template[type].side, { index: type === 'mp' ? '05' : '04' });
  html += template[type].footer;
  html += `</div>`;

  return html;
}

function formatLink(text = '') {
  const reg =
    /(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*))/gi;

  return text.replace(reg, `<a href="$1" target="_blank">$1</a>`);
}

async function writeFile(options) {
  const { html, volNum } = options;

  const minLetterHtml = await minifyHtml(html.letter);
  const minMpHtml = await minifyHtml(html.mp);

  if (!fs.existsSync(path.join(__dirname, 'dist'))) {
    fs.mkdirSync(path.join(__dirname, 'dist'));
  }

  fs.writeFileSync(`dist/letter-${volNum}.html`, html.letter, 'utf8');
  fs.writeFileSync(`dist/letter-${volNum}.min.html`, minLetterHtml, 'utf8');
  fs.writeFileSync(`dist/mp-${volNum}.html`, html.mp, 'utf8');
  fs.writeFileSync(`dist/mp-${volNum}.min.html`, adjustMpHtml(minMpHtml), 'utf8');
}

async function minifyHtml(html) {
  const cssInHtml = await inlineCss(html, {
    url: ' ',
    removeHtmlSelectors: true,
  });

  return minify(cssInHtml, {
    removeAttributeQuotes: false,
    collapseInlineTagWhitespace: true,
    collapseWhitespace: true,
  });
}

function adjustMpHtml(html) {
  return html
    .replace(/^<div[^>]*>/, '')
    .replace(/<\/div>$/, '')
    .replace(/<a\s/gi, '<span ')
    .replace(/<\/a>/gi, '</span>');
}

function start(volNum) {
  const md = getFile(volNum);
  const html = mdToHtml({ md, volNum });
  writeFile({ html, volNum });
}

start(volNum);
