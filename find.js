// var d3 = require('d3-dsv')
// var fs = require('fs')
// var oi = require('obj-iterate')

// var users = d3.csvParse(fs.readFileSync('Users.csv','utf-8'))
// var emails = oi(users).objectify((emails,user) => emails[user.ExternalEmail] = (emails[user.ExternalEmail] || []).concat([user]))


// emails = oi(emails).filter(users => users.length > 1)
// emails = oi(emails).filter((users,email) => email.match(/@byui.edu$/i))
// emails = oi(emails).map(users => users.filter(user => !user.UserName.match(/^cct_|^bsc_|^Test_|^ftc_|^it_|^ol_|^path_|^tgl_|^tc_|^ta_|^cert|@byui.edu/i)))
// emails = oi(emails).filter(users => users.length != 1)

// console.log(oi(emails).map(users => users.map(user => user.UserName)),Object.keys(emails).length)
// console.log(emails,Object.keys(emails).length)

// Object.keys(oi(oi(oi(emails).filter(users => users.length > 1)).map(users => users.filter(users => !users.UserName.includes('_')))).filter(n => n.length != 1)).length


var d3 = require('d3-dsv')
var fs = require('fs')
var oi = require('obj-iterate')

var users = d3.csvParse(fs.readFileSync('Users.csv','utf-8'))
var emails = oi(users).objectify((emails,user) => emails[user.ExternalEmail] = (emails[user.ExternalEmail] || []).concat([user]))
// emails = oi(emails).filter((users,email) => email.match(/@byui.edu$/i))

emails = oi(emails).map((users,email) => {
  if(users.length > 1){
    var filtered = users.filter(user => !user.UserName.match(/^cct_|^bsc_|^Test_|^ftc_|^it_|^ol_|^path_|^tgl_|^tc_|^ta_|^cert|@byui.edu/i))
    if(filtered.length == 1){
      return filtered[0].UserName
    } else {
      return users.map(n => n.UserName).sort((a,b) => a.length - b.length)[0]
    }
  } else {
    return users[0].UserName
  }
})

// var everyone = d3.csvParse(fs.readFileSync('everyone.csv','utf-8'))
// everyone.forEach(row => {
//   if(!emails[row.Email] && row.Email){
//     row.UserName = emails[row.Email]
//   }
// })

// fs.writeFileSync('newEveryone.csv',d3.csvFormat(everyone))
// console.log(oi(emails).map(users => users.map(user => user.UserName)),Object.keys(emails).length)