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
    /* eslint-disable */
    var pages = Array(36).fill().map((n,i) => i+1)
    var hrefs = [].concat(...await Promise.all(pages.map(getBlogLinks)))
    console.log('length',hrefs.length)
    fs.writeFileSync('bloghrefs.json',JSON.stringify(hrefs))
    /* eslint-enable */
}

async function scrapePost(href){
    try{
        var r = await got(href)
        var $ = cheerio.load(r.body)
        var parseTime = (m,mon,day,year,time) => ({month:mon,day:day,year:year,time:time})
        return {
            url:href,
            id:$('[data-content-id]').attr('data-content-id'),
            title:$('.entry-title a').text(),
            author:{
                name:$('.entry-byline a').text(),
                link:'https://onlineinstruction.ning.com' + $('.entry-byline a').attr('href'),
                photo:$('.entry-headline .photo.avatar').attr('src')
            },
            time:parseTime(...($('.entry-byline').text()).match(/([A-Z]\w+)\s+(\d+),\s+(\d+).*?(\d+:\d+(?:a|p)m)/)),
            body:$('section.entry-content.cf').html().trim()
        }
    }catch(e){
        console.log(e)
    }
    // Associated Main function
    /* eslint-disable */
    var hrefs = JSON.parse(fs.readFileSync('bloghrefs.json','utf-8'))
    var jumpSize = 20
    var blogs = []
    for(var i = 0; i < hrefs.length; i+=jumpSize){
        console.log(i,i+jumpSize)
        var pages = Array(jumpSize).fill().map((n,d) => hrefs[d+i])
        var chunk = await Promise.all(pages.map(scrapePost))
        blogs.push(...chunk.filter(n => n))
    }
    fs.writeFileSync('blogs.json',JSON.stringify(blogs))
    /* eslint-enable */

}

async function scrapeComments(blogid){
    try{
        var r = await got(`https://onlineinstruction.ning.com/main/comment/list?id=${blogid}&count=100000000000000`)
        var $ = cheerio.load(JSON.parse(r.body).commentsMarkup)
        var scrape = $li => ({
            id:$li.attr('data-comment-id'),
            time:$li.attr('data-comment-created-date'),
            author:{
                name:$li.find('.comments-author-name').text(),
                link:$li.find('.comments-author-name').attr('href'),
                photo:$li.find('.photo.avatar').attr('src'),
            },
            body:$li.find('.entry-content').html(),
            replies:$li.find('ul li').get().map(li => scrape($(li)))
        })
        return {
            blogid:blogid,
            comments: $('.comments-level1 > li').get().map(li => scrape($(li)))
        }
    } catch(e){
        console.log(e)
    }
}

async function main(){
    var blogs = JSON.parse(fs.readFileSync('blogs.json','utf-8'))
    var jumpSize = 10
    var comments = []
    for(var i = 0; i < blogs.length; i+=jumpSize){
        console.log(i,i+jumpSize)
        var pages = Array(jumpSize).fill().filter((n,d) => blogs[d+i]).map((n,d) => blogs[d+i].id)
        var chunk = await Promise.all(pages.map(scrapeComments))
        comments.push(...chunk.filter(n => n))
    }
    fs.writeFileSync('comments.json',JSON.stringify(comments))
}
main()