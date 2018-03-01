var got = require('got');
var fs = require('fs');
var cheerio = require('cheerio')

async function getBlogLinks(pagenum){
    try{
        var r = await got(`https://onlineinstruction.ning.com/blogs?page=${pagenum}`)
        console.log(pagenum)
        var $ = cheerio.load(r.body)
        return $('.entry-title a').get().map(n => n.attribs.href)
    } catch(e){
        console.error(e)
        return []
    }
    // Assotiated main function
    var pages = Array(36).fill().map((n,i) => i+1)
    var hrefs = [].concat(...await Promise.all(pages.map(getBlogLinks)))
    console.log('length',hrefs.length)
    fs.writeFileSync('bloghrefs.json',JSON.stringify(hrefs))
}

async function scrapePost(href){
    try{
        var r = await got(href)
        var $ = cheerio.load(r.body)
        var parseTime = (m,mon,day,year,time) => ({month:mon,day:day,year:year,time:time})
        return {
            id:$('[data-content-id]').attr('data-content-id'),
            title:$('.entry-title a').text(),
            author:{
                name:$('.entry-byline a').text(),
                link:$('.entry-byline a').attr('href'),
                photo:$('.entry-headline .photo.avatar').attr('src')
            },
            time:parseTime(...($('.entry-byline').text()).match(/([A-Z]\w+)\s+(\d+),\s+(\d+).*?(\d+:\d+(?:a|p)m)/)),
            body:$('section.entry-content.cf').html().trim()
        }
    }catch(e){
        console.log(e)
    }
}

async function main(){
    var hrefs = JSON.parse(fs.readFileSync('bloghrefs.json','utf-8'))
    var jumpSize = 10
    for(var i = 0; i < hrefs.length; i+=jumpSize){
        await Promise.all()
    }
}
