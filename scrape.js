var got = require('got');
var fs = require('fs');
var cheerio = require('cheerio')
var moment = require('moment')

async function getBlogLinks(file){
    async function forEach(forum){
        var pagenum = 1
        var isDone
        var hrefs = []
        do{
            try{
                console.log(forum,pagenum)
                var r = await got(`https://onlineinstruction.ning.com/${forum}?page=${pagenum}`)
                var $ = cheerio.load(r.body)
                isDone = $('li:last-child .pagination-current').length
                hrefs.push(...$('.entry-title a').get().map(n => n.attribs.href))
                pagenum++
            } catch(e){
                console.error(e)
            }
        } while(!isDone)
        return hrefs
    }

    var forums = [
        'blogs',
        'working-with-students',
        'working-in-the-online-classroom',
        'technology-resources',
        'i-learn-3-0-forum',
        'contract-and-employee-questions',
        'online-community-discussions',
    ]
    var hrefs = [].concat(...await Promise.all(forums.map(forEach)))
    fs.writeFileSync(file,JSON.stringify(hrefs))
    return hrefs
}

async function scrapePost(infile,outfile,limit){
    async function forEach(href){
        try{
            var r = await got(href)
            var $ = cheerio.load(r.body)
            var parseTime = (m,mon,day,year,time) => moment(`${mon} ${day} ${year} ${time}`,'MMMM DD YYYY h:mma').format()
            return {
                url:href,
                forum:href.match(/com\/(.*?)\//)[1],
                labels: $('.subnav a[href]').get().map(n => $(n).text()).slice(1),
                tags:$('.entry-tags a').get().map(n => $(n).text()),
                id:$('[data-content-id]').attr('data-content-id'),
                subject:$('.entry-title a').text(),
                author:{
                    name:$('.entry-byline a:first-child').text(),
                    link: $('.entry-byline a').attr('href'),
                    photo:$('.entry-headline .photo.avatar').attr('src')
                },
                time:parseTime(...($('.entry-byline').text()).match(/([A-Z]\w+)\s+(\d+),\s+(\d+).*?(\d+:\d+(?:a|p)m)/)),
                body:$('section.entry-content.cf').html().trim()
            }
        }catch(e){
            console.log(e)
        }
    }

    var hrefs = JSON.parse(fs.readFileSync(infile,'utf-8')).slice(-limit)
    var jumpSize = 20
    var blogs = []
    for(var i = 0; i < hrefs.length; i+=jumpSize){
        console.log(i,i+jumpSize)
        var pages = Array(Math.min(hrefs.length-i,jumpSize)).fill().map((n,d) => hrefs[d+i])
        var chunk = await Promise.all(pages.map(forEach))
        blogs.push(...chunk.filter(n => n))
    }
    fs.writeFileSync(outfile,JSON.stringify(blogs))
    return blogs
}

async function scrapeComments(infile,outfile,limit){
    async function forEach(blogid){
        try{
            var r = await got(`https://onlineinstruction.ning.com/main/comment/list?id=${blogid}&count=100000000000000`)
            var $ = cheerio.load(JSON.parse(r.body).commentsMarkup)
            var scrape = $li => ({
                id:$li.attr('data-comment-id'),
                time:moment($li.attr('data-comment-created-date')).format(),
                author:{
                    name:$li.find('> div .comments-author-name').text(),
                    link:$li.find('> div .comments-author-name').attr('href'),
                    photo:$li.find('> div .photo.avatar').attr('src'),
                },
                body:$li.find('> div .entry-content').html(),
                replies:$li.find('> ul > li').get().map(li => scrape($(li)))
            })
            return {
                blogid:blogid,
                comments: $('.comments-level1 > li').get().map(li => scrape($(li)))
            }
        } catch(e){
            console.log(e)
        }
    }

    var blogs = JSON.parse(fs.readFileSync(infile,'utf-8')).slice(-limit)
    var jumpSize = 10
    var comments = []
    for(var i = 0; i < blogs.length; i+=jumpSize){
        console.log(i,i+jumpSize)
        var pages = Array(Math.min(blogs.length-i,jumpSize)).fill().filter((n,d) => blogs[d+i]).map((n,d) => blogs[d+i].id)
        var chunk = await Promise.all(pages.map(forEach))
        comments.push(...chunk.filter(n => n))
    }
    fs.writeFileSync(outfile,JSON.stringify(comments))
    return comments
}

async function join(blogsfile,commentsfile,outfile){
    var blogs = require(blogsfile)
    var comments = require(commentsfile)
    var blogmap = blogs.reduce((obj,blog) => {obj[blog.id] = blog;return obj},{})
    comments.forEach(comment => {
        blogmap[comment.blogid].comments = comment.comments
    })
    fs.writeFileSync(outfile,JSON.stringify(blogs))
}

async function main(){
    var hrefsfile = './data/hrefs.json'
    var blogsfile = './data/blogs.json'
    var commentsfile = './data/comments.json'
    var allfile = './data/joined.json'
    
    // await getBlogLinks(hrefsfile)
    await scrapePost(hrefsfile,blogsfile)
    await scrapeComments(blogsfile,commentsfile)
    await join(blogsfile,commentsfile,allfile)
}
main()