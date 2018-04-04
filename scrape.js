var Ning = require('./ning')
var fs = require('fs')
var moment = require('moment')
var d3 = require('d3-dsv')
var oi = require('obj-iterate')

const xn_id_onlineinstruction = require('./cookie').cookie
var ning = new Ning(xn_id_onlineinstruction)

function getMembers(group){
  return ning.paginate(`teaching-groups/${group.linkname}/members`, $ => {
    return $('.matrix-item').get().map(n => ({
      // Get this information from each member
      name: $('.membersListPage-userName',n).text(),
      link: $('.membersListPage-userName a',n).attr('href'),
      photo: $('.avatar-frame img',n).attr('src'),
      isAdmin: $('.membersListPage-userIsAdmin',n).length,
    }))
  })
}
async function getForums(group){
  // Get the main page
  var $ = await ning.get(`teaching-groups/${group.linkname}`)
  // Get list of tags
  var tags = $('.groupHeader-tab a').get().map(n => ({link:$(n).attr('href'),name:$(n).text()}))
  // Go to each of the links and save the ones that look like a forum
  var forums = await Promise.all(tags.map(async tag => {
    console.log(tag.link)
    $ = await ning.get(tag.link)
    if($('.discussionListPage').length){
      return tag
    }
  }))
  return forums.filter(n => n)
}

async function scrapeGroups(groupfile){

  // Get the list of all the groups
  var groups = await ning.paginate('teaching-groups',$ => {
    return $('.matrix-item').get().map(n => ({
      // The things we want from the group description
      linkname: $('a',n).attr('href').match(/teaching-groups\/(.*?)$/)[1],
      numMembers: $('.groupHub-groupInfo',n).first().text().match(/(\d+)/)[1],
      title: $('.groupHub-groupTitle',n).first().text()
    }))
  })
  
  await Promise.all(groups.map(async group => {
    [group.members,group.forums] = await Promise.all([getMembers(group),getForums(group)])
  }))
  
  // Clean up the groups
  groups.forEach(group => {
    // Fill in the blank forums, and add the linkname attribute
    group.forums = group.forums || []
    group.forums.forEach(forum => {
      forum.linkname = forum.link.match(/[^\/]+$/)[0]
    })
  })

  fs.writeFileSync(groupfile,JSON.stringify(groups))
  return groups
}

async function main(){
  // var post = await ning.scrape('teaching-groups','pathway-instructors','forums','submitting-grades-pathway-and-math')
  // var groups = await scrapeGroups('groups.json') 
  var groups = JSON.parse(fs.readFileSync('groups.json','utf-8'))
  // var forums = [
  //   'blogs',
  //   'working-with-students',
  //   'working-in-the-online-classroom',
  //   'technology-resources',
  //   'contract-and-employee-questions',
  //   'online-community-discussions',
  // ]
  // var forums = groups.reduce((arr,group) => arr.concat(group.forums.map(n => n.link)),[])
  await Promise.all(groups.map(async group => {
    await Promise.all(group.forums.map(async forum => {
      var hrefs = await ning.paginate(forum.link,$ => $('.entry-title a').get().map(n => n.attribs.href))
      forum.posts = await Promise.all(hrefs.map(href => ning.scrape(href)))
      forum.posts = forum.posts.filter(n => n).filter(post => moment(post.time).isAfter('2017-10-1'))
    }))
  }))
  fs.writeFileSync('archive.json',JSON.stringify(groups))
}

main().catch(console.error)