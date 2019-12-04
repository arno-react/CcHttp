const CCHttp = require('./');

const bot = new CCHttp({
    apiRoot: 'http://127.0.0.1:5700/',
    accessToken: '',
    secret: ''
});

bot.on('ReceiveMessage', context => {
    bot.SendMessage(context.FromId, '哈喽～')
});

bot.on('ReceiveVerifyMsg', context => {
    //同意加好友
    bot.VerifyUser(3, context.FromUsername, context.EncryptUsername, context.Ticket)
});
// 忽略其它事件


bot.listen(8080);
