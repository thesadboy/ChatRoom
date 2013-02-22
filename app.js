
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server,{log:false});
var clients = [];
var users = [];
io.sockets.on('connection',function(socket){
  socket.on('online',function(user){
    //有人上线
    var isOnline = true;
    for(var i = 0; i < clients.length; i ++)
    {
      if(clients[i][0] == user)
      {
        clients.splice(i,1,[user,socket]);
        isOnline = false;
      }
    }
    if(isOnline)
    {
      for(var i = 0; i < clients.length; i ++)
      {
        clients[i][1].emit('system',JSON.stringify({msg:'用户 '+user+' 上线了！'}));
      }
      socket.emit('system',JSON.stringify({msg:'您已经进入聊天室了！'}));
      clients.push([user,socket]);
      users.unshift(user);
    }
    //刷新返回在线人员列表
    for(var i = 0; i < clients.length; i ++)
    {
      clients[i][1].emit('userflush',JSON.stringify({users:users}));
    }
  });
  socket.on('reonline',function(user){
    //有人上线
    var isOnline = true;
    for(var i = 0; i < clients.length; i ++)
    {
      if(clients[i][0] == user)
      {
        clients.splice(i,1,[user,socket]);
        isOnline = false;
      }
    }
    clients.push([user,socket]);
    users.unshift(user);
    //刷新返回在线人员列表
    for(var i = 0; i < clients.length; i ++)
    {
      clients[i][1].emit('userflush',JSON.stringify({users:users}));
    }
  });
  socket.on('say',function(data){
    //dataformat:{to:'all',from:'Nick',msg:'msg'}
    data = JSON.parse(data);
    var msgData = {
      time : (new Date()).getTime(),
      data : data
    }
    if(data.to == "all")
    {
      //对所有人说
      for(var i = 0; i < clients.length; i ++)
      {
        clients[i][1].emit('say',msgData);
      }
    }
    else
    {
      //对某人说
      for(var i = 0; i < clients.length; i ++)
      {
        if(clients[i][0] == data.to || clients[i][0] == data.from)
        {
          clients[i][1].emit('say',msgData);
        }
      }
    }
  });
  socket.on('offline',function(user){
    //有人下线
  });
  socket.on('disconnect',function(){
    //有人下线
    var user = '';
    for(var i = 0; i < clients.length; i ++)
    {
      if(clients[i][1] == socket)
      {
        user = clients[i][0];
        users.splice(users.indexOf(clients[i][0]),1);
        clients.splice(i,1);
      }
    }
    if(user != '')
    {
      for(var i = 0; i < clients.length; i ++)
      {
        clients[i][1].emit('system',JSON.stringify({msg:'用户 '+user+' 下线了！'}));
      }
    }
    //刷新返回在线人员列表
    for(var i = 0; i < clients.length; i ++)
    {
      clients[i][1].emit('userflush',JSON.stringify({users:users}));
    }
  });
});

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', function (req, res, next) {
  if(!req.headers.cookie)
  {
    res.redirect('/signin');
    return;
  }
  var cookies = req.headers.cookie.split(",");
  var isSign = false;
  for(var i = 0 ; i < cookies.length; i ++)
  {
    cookie = cookies[i].split("=");
    if(cookie[0]=="user" && cookie[1] != "")
    {
      isSign = true;
      break;
    }
  }
  if(!isSign)
  {
    res.redirect('/signin');
    return;
  }
  res.sendfile('views/index.html');
});
app.get('/signin',function(req,res,next){
  res.sendfile('views/signin.html');
});
app.get('/signup',function(req,res,next){
  res.sendfile('views/signup.html');
});
app.post('/signin',function(req,res,next){
  res.setHeader("Set-Cookie","user="+req.body.username);
  res.redirect('/');
});
server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
