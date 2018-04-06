const fs = require('fs')
const util = require('util')
const d3 = require('d3-dsv')
const path = require('path')

let counter = 1

const look = data => console.log(util.inspect(data,{depth:1,maxArrayLength:1}))

let groupPosts = require('./archive')
let file = fs.readFileSync('frog.json','utf-8')
let data = JSON.parse(file.replace('var data = ',''))
let memberMap = d3.csvParse(fs.readFileSync('everyone.csv','utf-8'))
let NodeMap = {
  blogs:'Blog',
  'working-with-students':'Student_Engagement',
  'working-in-the-online-classroom':'Managing_Online_Classroom',
  'technology-resources':'Implementing_Technology',
  'online-community-discussions':'Community_Discussions',
  'contract-and-employee-questions':'Contract_Employment',
}
// let groups = require('./groups.json')

/*
Message
ID    ParentID   ForumID    AuthorID    Type    Url     Time   Subject    Body

User
ID    Name       Link       Photo

GroupMembers
GroupID  UserID
 */

const Messages = []
const Users = []
const GroupMembers = []
const Tags = []

function PushMessage(message,rootID = message.id,parentID,nodeID = (NodeMap[message.forum]||'Archive_Group_Discussions')){
  message.id = message.id || "DeletedComment:"+counter++
  if(new Date(message.time) < new Date('2016') || (nodeID == 'Archive' && new Date(message.time) < new Date('2017-9'))){
    return
  }
  let authorID
  try {
    authorID = message.author.link.match(/\w+$/)[0]
    authorID = memberMap.find(row => row.NingId == authorID).UserName
  } catch(e){}
  // Push the message
  Messages.push({
    "Message ID": message.id,
    "Node ID": nodeID,
    "Root ID": rootID,
    "Date": message.time,
    "User ID": authorID||"UNKNOWN",
    "Name": authorID && (n => n && n.Name)(memberMap.find(row => row.UserName == authorID)),
    "Parent ID":parentID,
    "Subject":message.subject, 
    "Body":message.body?message.body.replace(/\n/g,''):'<p>This comment has been deleted</p>',
    "Labels":message.labels && message.labels.join(','),
    "Tags":message.tags && message.tags.join(','),
    _type:message.subject?'post':'comment',
    _url:message.url,
  })
  // Add the user if doesn't already exist
  if(!Users.find(user => user["User ID"] == authorID)){
    if(message.author.name){
      Users.push({
        "User ID":authorID,
        "Avatar image":message.author.photo,
        _link:message.author.link,
        _name: message.author.name
      })
    }
  }
  // Push the children
  ;(message.comments || message.replies).forEach(child => PushMessage(child,rootID,message.id,nodeID))
}

data.forEach(post => PushMessage(post))

groupPosts.forEach(g => g.forums.forEach(forum => forum.posts && forum.posts.forEach(post => PushMessage(post))))

// groups.forEach(group => {
//   group.members.forEach(member => {
//     GroupMembers.push({
//       "Group ID": group.linkname,
//       "User ID": member.link.match(/\w+$/)[0],
//       "Member Type": member.isAdmin?"Group Admin":"Group Member"
//     })
//   })
// })

const csvdir = path.join(__dirname,'csvs2')
if (!fs.existsSync(csvdir)) {
  fs.mkdirSync(csvdir);
}
fs.writeFileSync(path.join(csvdir,'Messages.csv'),d3.csvFormat(Messages))
fs.writeFileSync(path.join(csvdir,'User Data.csv'),d3.csvFormat(Users))
// fs.writeFileSync(path.join(csvdir,'Groups.csv'),d3.csvFormat(GroupMembers))
