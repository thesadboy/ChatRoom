
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
var oldSocket = "";
var getDiffTime = function()
{
  if(disconnect)
  {
    return connect - disconnect;
  }
  return false;
}
io.sockets.on('connection',function(socket){
  socket.on('online',function(data){
    var data = JSON.parse(data);
    //检查是否是已经登录绑定
    if(!clients[data.user])
    {
      //新上线用户，需要发送用户上线提醒,需要向客户端发送新的用户列表
      users.unshift(data.user);
      for(var index in clients)
      {
        clients[index].emit('system',JSON.stringify({type:'online',msg:data.user,time:(new Date()).getTime()}));
        clients[index].emit('userflush',JSON.stringify({users:users}));
      }
      socket.emit('system',JSON.stringify({type:'in',msg:'',time:(new Date()).getTime()}));
      socket.emit('userflush',JSON.stringify({users:users}));
    }
      clients[data.user] = socket;
      socket.emit('userflush',JSON.stringify({users:users}));
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
      for(var index in clients)
      {
        clients[index].emit('say',msgData);
      }
    }
    else
    {
      //对某人说
      clients[data.to].emit('say',msgData);
      clients[data.from].emit('say',msgData);
    }
  });
  socket.on('offline',function(user){
    socket.disconnect();
  });
  socket.on('disconnect',function(){
    //有人下线
    setTimeout(userOffline,5000);
    function userOffline()
    {
      for(var index in clients)
      {
        if(clients[index] == socket)
        {
          users.splice(users.indexOf(index),1);
          delete clients[index];
          for(var index_inline in clients)
          {
            clients[index_inline].emit('system',JSON.stringify({type:'offline',msg:index,time:(new Date()).getTime()}));
            clients[index_inline].emit('userflush',JSON.stringify({users:users}));
          }
          break;
        }
      }
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
  app.use(express.cookieParser());
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
  var cookies = req.headers.cookie.split("; ");
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
  res.cookie("user",req.body.username[0]);
  res.redirect('/');
});
server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
