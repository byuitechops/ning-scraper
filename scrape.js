var got = require('got');
var fs = require('fs');
var cheerio = require('cheerio')

async function getBlogLinks(file){
    async function forEach(forum,pagenum){
        try{
            var r = await got(`https://onlineinstruction.ning.com/${forum}?page=${pagenum}`)
            console.log(forum,pagenum)
            var $ = cheerio.load(r.body)
            return $('.entry-title a').get().map(n => n.attribs.href)
        } catch(e){
            console.error(e)
            return []
        }
    }

    var forums = [
        {name:'blogs',pagecount:36},
        {name:'working-with-students',pagecount:15},
        {name:'working-in-the-online-classroom',pagecount:12},
        {name:'technology-resources',pagecount:6},
        {name:'i-learn-3-0-forum',pagecount:66},
        {name:'contract-and-employee-questions',pagecount:5},
        {name:'online-community-discussions',pagecount:9},
    ]
    var hrefs = []
    for(var f = 0; f < forums.length; f++){
        var pages = Array(forums[f].pagecount).fill().map((n,i) => i+1)
        var chunk = await Promise.all(pages.map(n => forEach(forums[f].name,n)))
        hrefs.push(...[].concat(...chunk))
    }
    fs.writeFileSync(file,JSON.stringify(hrefs))
    return hrefs
}

async function scrapePost(infile,outfile){
    async function forEach(href){
        try{
            var r = await got(href)
            var $ = cheerio.load(r.body)
            var parseTime = (m,mon,day,year,time) => ({month:mon,day:day,year:year,time:time})
            return {
                url:href,
                catagories: $('.subnav a[href]').get().map(n => $(n).text()).slice(1),
                tags:$('.entry-tags a').get().map(n => $(n).text()),
                id:$('[data-content-id]').attr('data-content-id'),
                title:$('.entry-title a').text(),
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

    var hrefs = JSON.parse(fs.readFileSync(infile,'utf-8'))
    var jumpSize = 20
    var blogs = []
    for(var i = 0; i < hrefs.length; i+=jumpSize){
        console.log(i,i+jumpSize)
        var pages = Array(jumpSize).fill().map((n,d) => hrefs[Math.min(hrefs.length-1,d+i)])
        var chunk = await Promise.all(pages.map(forEach))
        blogs.push(...chunk.filter(n => n))
    }
    fs.writeFileSync(outfile,JSON.stringify(blogs))
    return blogs
}

async function scrapeComments(infile,outfile){
    async function forEach(blogid){
        try{
            var r = await got(`https://onlineinstruction.ning.com/main/comment/list?id=${blogid}&count=100000000000000`)
            var $ = cheerio.load(JSON.parse(r.body).commentsMarkup)
            var scrape = $li => ({
                id:$li.attr('data-comment-id'),
                time:$li.attr('data-comment-created-date'),
                author:{
                    name:$li.find('> div .comments-author-name').text(),
                    link:$li.find('> div .comments-author-name').attr('href'),
                    photo:$li.find('> div .photo.avatar').attr('src'),
                },
                body:$li.find('> div .entry-content').html(),
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

    var blogs = JSON.parse(fs.readFileSync(infile,'utf-8'))
    var jumpSize = 10
    var comments = []
    for(var i = 0; i < blogs.length; i+=jumpSize){
        console.log(i,i+jumpSize)
        var pages = Array(jumpSize).fill().filter((n,d) => blogs[d+i]).map((n,d) => blogs[Math.min(blogs.length-1,d+i)].id)
        var chunk = await Promise.all(pages.map(forEach))
        comments.push(...chunk.filter(n => n))
    }
    fs.writeFileSync(outfile,JSON.stringify(comments))
    return comments
}


async function main(){
    var hrefsfile = './data/hrefs.json'
    var blogsfile = './data/blogs.json'
    var commentsfile = './data/comments.json'
    
    // await getBlogLinks(hrefsfile)
    // await scrapePost(hrefsfile,blogsfile)
    // await scrapeComments(blogsfile,commentsfile)
}
main()