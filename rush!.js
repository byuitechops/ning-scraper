var d3 = require('d3-dsv')
var fs = require('fs')
var oi = require('obj-iterate')

var everyone = d3.csvParse(fs.readFileSync('everyone.csv','utf-8'))
var memberdata = d3.csvParse(fs.readFileSync('memberdata.csv','utf-8'))
var users = d3.csvParse(fs.readFileSync('Users.csv','utf-8'))

everyone // Name,Profile Address,Date Joined,UserName,OrgDefinedId,Email,FirstName,LastName,NingId,foundBy
memberdata // Name,"Profile Address",Email,Gender,Location,Country,Zip,Age,Birthdate,"Date Joined","Receiving Broadcasts?","Receiving Any Emails?","Last Visit","Which role best describes you?","What do you feel you can contribute to online instructors or the BYU-Idaho online learning experience?","What subject are you teaching?","Where do you currently reside?"
users // UserId,UserName,OrgDefinedId,FirstName,MiddleName,LastName,IsActive,Organization,InternalEmail,ExternalEmail,SignupDate

var emails = oi(users).objectify((emails,user) => emails[user.ExternalEmail] = (emails[user.ExternalEmail] || []).concat([user]))
emails = oi(emails).filter((users,email) => email.match(/@byui.edu$/i))

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
var i = 0
var mine = memberdata.map(row => {
  var data = {}
  data.NingId = everyone.find(r => r['Profile Address'] == row['Profile Address']).NingId
  data.Name = row.Name
  // Only accept email if it a byui.edu email
  data.Email = row.Email.match(/@byui.edu$/i) ? row.Email.toLowerCase() : undefined
  // Match by name if we don't have an email for them 
  if(!data.Email){
    // Match by name
    var found = users.filter(user => 
      user.FirstName.toLowerCase() == String(row.Name.match(/^\w+/)).toLowerCase() && 
      user.LastName.toLowerCase() == String(row.Name.match(/\w+$/)).toLowerCase() &&
      user.ExternalEmail.match(/@byui.edu$/i)
    )
    if(found.length == 1){
      data.Email = found[0].ExternalEmail
    }
  }
  data.UserName = data.Email && emails[data.Email]
  return data
})

fs.writeFileSync('newEveryone.csv',d3.csvFormat(mine))