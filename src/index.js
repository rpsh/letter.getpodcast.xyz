const fs = require('fs');
const path = require('path');

const yargs = require('yargs');
const inlineCss = require('inline-css');
const minify = require('html-minifier').minify;
const Mustache = require('mustache');

const database = require('./database.json');
const dataMp = require('./data-mp.json');

const argv = yargs.argv;
const volNum = argv.v || argv.vol || argv._[0];

if (!volNum) {
  console.error('缺少 vol 号\n示例： node index.js -v=001');
  process.exit(1);
}

const template = {
  letter: {
    css: fs.readFileSync(path.join(__dirname, './style/letter.css'), 'utf8'),
    ...getTemplates('letter'),
  },
  mp: {
    css: fs.readFileSync(path.join(__dirname, './style/mp.css'), 'utf8'),
    ...getTemplates('mp'),
  },
};

function getTemplates(type) {
  const dir = path.join(__dirname, `./template/${type}`);
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
  const fileName = path.join(__dirname, '../letters/' + volNum + '.md');
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
      mpPic:
        (dataMp[volNum] && dataMp[volNum].pic) ||
        `https://letter.getpodcast.xyz/img/vol_${volNum}_small.png`,
    },
    content: [],
  };

  mdLines.forEach((item, index) => {
    const contentItem = data.content[data.content.length - 1];
    let lastItem;
    if (contentItem && contentItem.items && contentItem.items.length) {
      lastItem = contentItem.items[contentItem.items.length - 1];
    }
    if (index === 0 || index === 1) {
      return true;
    } else if (index === 2) {
      data.header.desc = item.replace(/^Intro:\s+/, '').trim();
    } else if (index === 3) {
      data.header.readTime = item.replace(/^Read:\s+/g, '').trim();
    } else if (/^#\s/.test(item) && flag === 0) {
      flag = 1;
      data.header.title = item.replace(/^#\s/, '').trim();
    } else if (/^##\s随便听听/.test(item)) {
      flag = 'roam';
      data.content.push({
        title: item.replace(/^##\s/, '').trim(),
        items: [],
        type: 'roam',
        index: `${data.content.length + 1}`.padStart(2, '0'),
      });
    } else if (/^##\s播客新声/.test(item)) {
      flag = 'newbie';
      data.content.push({
        title: item.replace(/^##\s/, '').trim(),
        items: [],
        type: 'newbie',
        index: `${data.content.length + 1}`.padStart(2, '0'),
      });
    } else if (/^##\s/.test(item) && (flag === 1 || flag === 'feature')) {
      data.content.push({
        title: item.replace(/^##\s/, '').trim(),
        items: [],
        type: 'feature',
        index: `${data.content.length + 1}`.padStart(2, '0'),
      });
    } else if (item && !/^[#|*|-|\s|!]/.test(item) && flag === 1) {
      if (contentItem.intro) {
        contentItem.intro += '<br/>' + formatLink(item.trim());
      } else {
        contentItem.intro = item.trim();
      }
    } else if (/^###\s/.test(item) && (flag === 1 || flag === 'feature')) {
      flag = 'feature';
      contentItem.items.push({
        title: item.replace(/^###\s/, '').trim(),
      });
    } else if (item && !/^[#|*|-|\s]/.test(item) && flag === 'feature') {
      if (lastItem && lastItem.intro) {
        lastItem.intro += '<br/>' + formatLink(item.trim());
      } else if (lastItem) {
        lastItem.intro = formatLink(item.trim());
      } else {
        contentItem.intro = formatLink(item.trim());
      }
    } else if (/^####\s/.test(item) && flag === 'feature') {
      const title = item.match(/\[(.*)\]/)[1];
      if (!lastItem.author) {
        lastItem.author = [];
      }
      lastItem.author.push({
        name: title.trim(),
        rss: item.match(/\((.*)\)/)[1],
        desc: item.match(/\_([^_]*)\_/) && item.match(/\_([^_]*)\_/)[1],
        logo: database[title] && database[title].logo,
        pic: database[title] && database[title].pic,
      });
      // console.log(JSON.stringify(data,null, 2));
    } else if (/^\*\s/.test(item) && flag === 'roam') {
      contentItem.items.push({
        title:
          (item.match(/\*\s([^_]*)\_/) && item.match(/\*\s([^_]*)\_/)[1]) ||
          item.replace(/^\*\s/, ''),
        intro:
          (item.match(/\_([^_]*)\_/) && item.match(/\_([^_]*)\_/)[1]) || '',
      });
    } else if (/^\s\s####/.test(item) && flag === 'roam') {
      lastItem.author = {
        name: item.match(/\[(.*)\]/)[1],
        rss: item.match(/\((.*)\)/)[1],
      };
    } else if (/^\*\s/.test(item) && flag === 'newbie') {
      contentItem.items.push({
        title: item.match(/\*\s([^_]*)\_/)[1],
        intro: item.match(/\_([^_]*)\_/)[1],
      });
    } else if (/^\s\s/.test(item) && flag === 'newbie') {
      lastItem.rss = item.replace(/^\s\s/, '');
    }
  });

  return data;
}

function generateHtml(options) {
  const { type, data } = options;
  const gap =
    type === 'mp'
      ? `<p class="gap_line"><span>.</span></p>`
      : '<div class="gap_line"></div>';

  let html = `<style>${template[type].css}</style>`;
  html += `<div class="content">`;
  html += Mustache.render(template[type].header, data.header);
  data.content.forEach((item) => {
    const t = item.type;
    html += Mustache.render(template[type][t], item);
    html += gap;
  });
  const num = data.content.length + 1;
  if (type === 'mp') {
    html += template[type].ad;
    html += gap;
    html += Mustache.render(template[type].shortcut, {
      index: `${num}`.padStart(2, '0'),
    });
    html += gap;
  }
  html += Mustache.render(template[type].side, {
    index:
      type === 'mp' ? `${num + 1}`.padStart(2, '0') : `${num}`.padStart(2, '0'),
  });
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

  const dist = path.join(__dirname, '../dist');

  if (!fs.existsSync(dist)) {
    fs.mkdirSync(dist);
  }

  fs.writeFileSync(
    path.join(dist, `./${volNum}-letter.html`),
    html.letter,
    'utf8'
  );
  fs.writeFileSync(
    path.join(dist, `./${volNum}-letter.min.html`),
    minLetterHtml,
    'utf8'
  );
  fs.writeFileSync(path.join(dist, `./${volNum}-mp.html`), html.mp, 'utf8');
  fs.writeFileSync(
    path.join(dist, `./${volNum}-mp.min.html`),
    adjustMpHtml(minMpHtml),
    'utf8'
  );
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
