const got = require('got')
const cookie = require('cookie')
const url = require('url')
const { URL } = url
const cheerio = require('cheerio')
const fs = require('fs')
const promiseLimit = require('promise-limit')
const urljoin = require('url-join')
const moment = require('moment')

const nophoto = "https://api.ning.com/files/-oaic7y9RVT176KkUYtUnYNzdMXHz89FzqYVLaZbYwjSy*uTDlcAOMfiXc7WT6jYii-xuSZhV*FDGm8UA5pnzTGxHEFwZaAz/noprofilepic.png?width=96&height=96&crop=1%3A1"

function sleep(ms){
  return new Promise(resolve=>{
    setTimeout(resolve,ms)
  })
}

class Ning{
  constructor(xn_id_onlineinstruction){
    this.origin = "https://onlineinstruction.ning.com/"
    this.cookie = cookie.serialize('xn_id_onlineinstruction',xn_id_onlineinstruction)
    this.promiseQueue = promiseLimit(30)
  }
  resolve(){
    return new URL(url.resolve(this.origin,urljoin(...arguments)))
  }
  async get(/* [...path],options */){
    while(this.promiseQueue.queue > 10){
      await sleep(100)
    }
    // parsing out the arguments
    var path = [],i=0
    while(typeof arguments[i] == 'string') path.push(arguments[i++]);
    var target = this.resolve(...path)
    var options = arguments[i]
    var r = await this.promiseQueue(() => got(target.href,{
      headers:{
        cookie:this.cookie
      }
    }))
    if(options && options.jsonPath) {
      r.body = options.jsonPath.split('.').reduce((json,path) => json[path],JSON.parse(r.body))
    }
    if(options && options.save) fs.writeFileSync(options.save,r.body);
    return cheerio.load(r.body)
  }
  async paginate(path,iteri){
    var done,pagenum = 1
    async function getPage(pagenum){
      var target = this.resolve(path)
      target.searchParams.set('page',pagenum)
      const $ = await this.get(target.href)
      console.log(`${path} ${$('.pagination-current').text()}/${$('.pagination-last').text()}`)
      return iteri($)
    }
    var $
    try{
      $ = await this.get(path)
    } catch(e){
      console.error('Had a problem getting '+path)
      return []
    }
    var last = $('.pagination-last').text() || 1
    var responses = await Promise.all(Array(+last).fill().map((n,i) => getPage.call(this,i+1)))
    return [].concat(...responses)
  }
  async _scrapePost(path){
    var $, target = this.resolve(path)
    try{
      $ = await this.get(path)
    } catch(e){
      throw path+" not found :"+e
    }
    var parseTime = (m,mon,day,year,time) => moment(`${mon} ${day} ${year} ${time}`,'MMMM DD YYYY h:mma').format()
    return {
      url:target.href,
      forum:target.href.match(/com\/(.*?)\//)[1],
      labels: $('.subnav a[href]').get().map(n => $(n).text()),
      tags:$('.entry-tags a').get().map(n => $(n).text()),
      id:$('[data-content-id*=Entry]').attr('data-content-id'),
      subject:$('.entry-title a').text(),
      author:{
        name:$('.entry-byline a:first-child').text(),
        link: $('.entry-byline a').attr('href'),
        photo:$('.entry-headline .photo.avatar').attr('src')
      },
      time:parseTime(...$('.entry-byline').text().match(/([A-Z]\w+)\s+(\d+),\s+(\d+).*?(\d+:\d+(?:a|p)m)/)),
      body:$('section.entry-content.cf').html().trim()
    }
  }
  async _scrapeComment(blogid){
    var $,path = `https://onlineinstruction.ning.com/main/comment/list?id=${blogid}&count=100000000000000`
    try{
      $ = await this.get(path,{save:'temp.html',jsonPath:'commentsMarkup'})
    } catch(e){
      throw blogid+" not found :"+e
    }
    var scrape = $li => ({
      id:$li.attr('data-comment-id'),
      time:moment($li.attr('data-comment-created-date')).format(),
      author:{
        name:$li.find('> div .comments-author-name').text(),
        link:$li.find('> div .comments-author-name').attr('href') || "",
        photo:$li.find('> div .photo.avatar').attr('src') || nophoto,
      },
      body:$li.find('> div .entry-content').html(),
      replies:$li.find('> ul > li').get().map(li => scrape($(li)))
    })
    return $('.comments-level1 > li').get().map(li => scrape($(li)))
  }
  async scrape(){
    var path = urljoin(...arguments), post
    try{
      post = await this._scrapePost(path)
      post.comments = await this._scrapeComment(post.id)
      console.log(path)
      return post
    } catch(e){
      console.log(e)
    }
  }
}



module.exports = Ning