'use strict';

const Callable = require('./callable');
const axios = require('axios');
const Koa = require('koa');
const bodyParser = require('koa-bodyparser')
const router = require('koa-router');
let Route = new router()

module.exports = class WXHttp extends Callable {
    constructor({ apiRoot, accessToken, secret }) {
        super('__call__');
        if (apiRoot) {
            const headers = { 'Content-Type': 'application/x-www-from-urlencoded;charset=utf-8' }
            if (accessToken) headers['Authorization'] = `Token ${accessToken}`;
            this.apiClient = axios.create({ baseURL: apiRoot, headers: headers });
        }
        this.secret = secret;
        this.app = new Koa();
        this.app.use(bodyParser());
        Route.post('/', this.postHandle.bind(this))
        Route.get('/', this.getHandle.bind(this))
        this.app.use(Route.routes());
        /**
         * 机器人事件、参数说明：
            http://cocoqq.cc/doc/mc/%E5%AE%89%E5%8D%93%E5%BE%AE%E4%BF%A1%E6%9C%BA%E5%99%A8%E4%BA%BA%E6%8F%92%E4%BB%B6%E5%BC%80%E5%8F%91-2.html
            JoinChatroom：机器人收到进群邀请（邀请机器人进群）
            PushLoginUrl：其它设备需要登录
            ReceiveSysMsg：系统消息，包括谁改了群名、谁加入群了、谁退出群了等
            ReceiveVerifyMsg：加机器人为好友，需要机器人确认通过
            ReceiveTransferMsg：收到转账，需要自己调用方法确认收款
            ReceiveQRPayMsg：收到二维码付款
            ReceiveHBMsg：收到红包消息，需要自己调用收红包才能收到
            ReceiveMessage：收到消息，最复杂的一个事件，微信很多事情都用这个来通知，框架解析了一些，如果有需要解析的，可以再反馈。
         */
        this.callbacks = {
            JoinChatroom: [],
            PushLoginUrl: [],
            ReceiveSysMsg: [],
            ReceiveVerifyMsg: [],
            ReceiveQRPayMsg: [],
            ReceiveHBMsg: [],
            ReceiveMessage: []
        };
        this.self_list = ''
        // this.get_logged_account_list().then(res => {
        //     console.log('get_logged_account_list', res)
        //     this.self_list = res
        // })
    }
    getHandle(ctx){
        ctx.response.body = JSON.stringify({code:0});
    }
    postHandle(ctx) {
        if (this.secret) {
            // check signature
        }

        let result = {};
        let msgType = ctx.request.body.Event
        const callbacks = this.callbacks[msgType];
        if (callbacks) {
            for (const cb of callbacks) {
                // only the result of the last callback matters
                const res = cb(ctx.request.body);
                if (res) {
                    result = res;
                }
            }
        }
        ctx.response.body = JSON.stringify(result);
    }

    on(type, callback) {
        this.callbacks[type].push(callback);
    }
    listen (...args) {
        this.app.listen(...args);
    }
    __call__(action, params = []) {
        if (this.apiClient) {
            let data = encodeURIComponent(`<&&>${action}<&>${params.join('<&>')}`)
            console.log(data)
            return this.apiClient.post(`/`, `a=${data}`).then(response => {
                let err = {
                    status: response.status
                };
                if (response.status === 200) {
                    const data = response.data;
                    if (data.status === 'failed') {
                        err.retcode = data.retcode;
                        return Promise.reject(err);
                    }
                    return Promise.resolve(data.data);
                } else {
                    return Promise.reject(err);
                }
            });
        }
    }
    /**
     * 可查询余额、银行卡等
     */
    BindQueryNew(){
        let data = []
        return this.__call__('BindQueryNew', data)
    }
    /**
     * 提现
     * @param {int} total_fee  单位分
     * @param {string} card_tail 卡号后4位（可不填）
     * @param {string} password 钱包密码
     */
    Genprefetch( total_fee,  card_tail = "",  password = "123456"){
        let data = [total_fee,  card_tail, password ]
        return this.__call__('Genprefetch', data)
    }
    /**
     * 获取收款二维码，请做好本地缓存，防止频繁获取被tx屏蔽
     * @param {int} fee 
     * @param {string} desc 
     * @param {string} fee_type 
     */
    GetPayUrl( fee,  desc,  fee_type = "1"){
        let data = [ fee,  desc,  fee_type]
        return this.__call__('GetPayUrl', data)
    }
    /**
     * 转账
     * @param {string} to_wxid 接收者wxid
     * @param {int} fee 单位分
     * @param {string} desc 转账说明
     * @param {string} password  钱包密码
     */
    Transfer( to_wxid,  fee,  desc,  password = "123456"){
        let data = [to_wxid,  fee,  desc,  password ]
        return this.__call__('Transfer', data)
    }
    /**
     * 收款
     * @param {TransferMsg} msg  收到转账时带的，web调用需要JSON序列化成字符串传递
     */
    ReceiveTransfer(msg) {
        let data = [msg]
        return this.__call__('ReceiveTransfer', data)
    }
    /**
     * 发红包
     * @param {string} wxid  接收者，可以是群wxid，也可以是好友wxid
     * @param {int} hbType  0：普通红包 1：拼手气红包
     * @param {int} totalAmount  单位分
     * @param {int} totalNum 红包个数，群红包必须能分配，不能出现类似1分钱2个红包的情况
     * @param {string} wishing 祝福语
     * @param {string} password 钱包密码
     */
    SendHBSendHB(wxid, hbType, totalAmount, totalNum = 1, wishing = "恭喜发财", password = "123456") {
        let data = [wxid, hbType, totalAmount, totalNum, wishing , password]
        return this.__call__('SendHBSendHB', data)
    }
    /**
     * 收红包 
     * @param {HBMsg} msg 这是一个收到红包时的对象，web调用需要json序列化成字符串传给机器人，机器人反序列化成对象
     */
    ReceiveHB(msg) {
        let data = [msg]
        return this.__call__('SendAppMsgRaw', data)
    }
    /**
     * 别人给机器人发送进群邀请链接，机器人可以用此方法同意邀请
     * @param {string} url  收到好友验证时附带的
     */
    AgreeJoin(url) {
        let data = [url]
        return this.__call__('AgreeJoin', data)
    }
    /**
     * 同意加好友请求
     * @param {int} opcode  传3即可
     * @param {string} user_wxid 收到的FromUsername
     * @param {string} user_v1_name 收到的EncryptUsername
     * @param {string} user_ticket 收到的Ticket
     * @param {string} user_anti_ticket 空着即可
     * @param {string} send_content 空着即可
     */
    VerifyUser(opcode, user_wxid, user_v1_name, user_ticket, user_anti_ticket = "", send_content = "") {
        let data = [opcode, user_wxid, user_v1_name, user_ticket, user_anti_ticket, send_content]
        return this.__call__('VerifyUser', data)
    }
    /**
     * 发送消息
     * @param {string} wxid  接收者wxid
     * @param {string} msg_content 消息内容，支持XML格式，不要问我有哪些，我也没测试那么多，请自行收集。另外@成员时，内容开头加入@成员昵称，才能看到@效果
     * @param {string} at_user_list 如果是群消息，这里可以填写@对象wxid，多个使用半角逗号分隔
     * @param {int} msg_type 消息类型，我只测试了1的情况。默认填写1即可
     */
    SendMessage(wxid, msg_content, at_user_list = null, msg_type = 1) {
        console.log(arguments)
        let data = [wxid, msg_content, at_user_list, msg_type]
        return this.__call__('SendMessage', data)
    }
    /**
     * 发送图片
     * @param {string} wxid 接收者wxid
     * @param {string} file 本地绝对路径，网络图片请自行下载
     */
    SendImage(wxid, file) {
        let data = [file]
        return this.__call__('SendImage', data)
    }
    /**
     * 发送名片
     * @param {string} to_wxid  //接收者wxid
     * @param {string} wxid //名片的wxid
     */
    SendCard(to_wxid, wxid) {
        let data = [to_wxid, wxid]
        return this.__call__('SendCard', data)
    }
    /**
     * 分享链接
     * @param {string} to_wxid 接收者wxid
     * @param {string} title 标题
     * @param {string} des 描述
     * @param {string} link_url  链接地址http格式
     * @param {string} thumb_url 缩略图地址http格式
     */
    SendAppMsg(to_wxid, title, des, link_url, thumb_url = "") {
        let data = [to_wxid, title, des, link_url]
        return this.__call__('SendAppMsg', data)
    }
    /**
     * 发送原始appmsg，可以实现点歌、发小程序、发链接等
     * @param {string} to_wxid  接收者wxid
     * @param {string} content 自己构造XML，不要问我XML怎么构造，我也没有，自己想办法
     * @param {int} type 没研究过，不知道啥意思，大家自己黑盒测试
     */
    SendAppMsgRaw(to_wxid, content, type = 5) {
        let data = [to_wxid, content, type]
        return this.__call__('SendAppMsgRaw', data)
    }
    /**
     * 发送emoji表情
     * @param {string} wxid 接收者wxid
     * @param {string} file_name emoji加密文件名
     * @param {string} game_type game_type=0直接发送emoji; game_type=1无视file_name参数,接收方播放石头剪刀布动画;其余game_type值均为投骰子动画
     * @param {string} content  在game_type不为0即发送游戏表情时有效;content取1-3代表剪刀、石头、布;content取4-9代表投骰子1-6点;
     */
    SendEmoji(wxid, file_name, game_type, content) {
        let data = [wxid, file_name, game_type, content]
        return this.__call__('SendEmoji', data)
    }
    /**
     * 撤回消息
     * @param {string} wxid 消息接收者
     * @param {long} svrid 发消息返回的消息id
     */
    RevokeMsg( wxid, svrid){
        let data = [wxid, svrid]
        return this.__call__('RevokeMsg', data)
    }
    /**
     * 建群
     * @param {string} wxids  成员wxid，web调用多个wxid使用,连接
     */
    CreateChatRoom(wxids) {
        let data = [wxids]
        return this.__call__('CreateChatRoom', data)
    }
    /**
     * 群聊拉人
     * @param {string} chatroom_wxid  群wxid
     * @param {string} member_list 成员列表，web调用用,分割
     */
    AddChatRoomMember(chatroom_wxid, member_list) {
        let data = [chatroom_wxid, member_list]
        return this.__call__('AddChatRoomMember', data)
    }
    /**
     * 群踢人
     * @param {string} chatroom_wxid  群wxid
     * @param {string} member_list 成员列表，web调用用,分割
     */
    DelChatRoomMember(chatroom_wxid, member_list) {
        let data = [chatroom_wxid, member_list]
        return this.__call__('DelChatRoomMember', data)
    }
    /**
     * 设置机器人在群内的昵称
     * @param {string} chatroom_wxid 群wxid
     * @param {string} nick_name 昵称
     */
    SetGroupNickName(chatroom_wxid, nick_name){
        let data = [chatroom_wxid, nick_name]
        return this.__call__('SetGroupNickName', data)
    }
    /**
     * 发布群公告
     * @param {string} wxid  群wxid
     * @param {string} text 公告内容
     */
    SetChatroomAnnouncement( wxid,  text){
        let data = [wxid, text]
        return this.__call__('SetChatroomAnnouncement', data)
    }
    /**
     * 设置机器人在群内的昵称
     * @param {string} chatroom_wxid  群wxid
     * @param {string} nick_name 昵称
     */
    SetGroupNickName(chatroom_wxid, nick_name) {
        let data = [chatroom_wxid, nick_name]
        return this.__call__('SetGroupNickName', data)
    }

    /**
     * 设置好友备注名/群聊名
     * @param {string} wxid  wxid
     * @param {string} name 备注名或者群名
     */
    SetFriendName(wxid, name) {
        let data = [wxid, name]
        return this.__call__('SetFriendName', data)
    }
    /**
     * 拉黑/恢复 好友关系
     * @param {string} wxid 
     * @param {bool} ban 拉黑还是恢复，自己测试下
     */
    BanFriend(wxid, ban = true) {
        let data = [wxid, ban]
        return this.__call__('BanFriend', data)
    }
    /**
     * 从通讯录中删除好友/恢复好友(删除对方后可以用此接口再添加对方)
     * 群聊使用此接口可以保存到通讯录
     * @param {string} wxid 
     * @param {bool} del 
     */
    DeleteFriend( wxid, del  = true){
        let data = [wxid, del]
        return this.__call__('DeleteFriend', data)
    }

    /**
     * 设置昵称、个性签名
     * @param {int} cmd 1：昵称 2：个性签名
     * @param {string} text  内容
     */
    SetUserInfo(cmd, text) {
        let data = [cmd, text]
        return this.__call__('SetUserInfo', data)
    }
    /**
     * 其它设备扫码登录
     * @param {string} url  二维码内容
     */
    DeviceLogin(url) {
        let data = [url]
        return this.__call__('DeviceLogin', data)
    }
    /**
     * 确认其它设备登录
     * @param {string} url  机器人收到的内容
     */
    ExtDeviceLoginConfirmOK(url) {
        let data = [url]
        return this.__call__('ExtDeviceLoginConfirmOK', data)
    }
    /**
     * 从服务器获取单个好友或者群
     * @param {string} wxid  如果传空字符串，从本地获取所有成员，否则从服务器获取单个成员
     */
    GetContact( wxid){
        let data = [wxid]
        return this.__call__('ExtDeviceLoginConfirmOK', data)
    }
    /**
     * 修改群聊邀请确认
     * @param {string} wxid  群wxid
     * @param {int} code  0：关闭确认 2：开启确认
     */
    ChatroomInviteConfirm(wxid,  code){
        let data = [wxid,  code]
        return this.__call__('ChatroomInviteConfirm', data)
    }
    /**
     * 转让群主
     * @param {string} ChatRoomWxid 群wxid
     * @param {string} OwnerWxid 新群主wxid
     */
    TransferChatroomOwner( ChatRoomWxid,  OwnerWxid){
        let data = [ChatRoomWxid,  OwnerWxid]
        return this.__call__('TransferChatroomOwner', data)

    }
    /**
     * 确认群成员邀请
     * @param {string} ChatRoomWxid  群wxid
     * @param {string} ticket 收到的令牌
     * @param {string} Inviter   邀请者wxid
     * @param {string} Wxid 被邀请者
     */
    ApproveAddChatroomMember( ChatRoomWxid,  ticket,  Inviter,  Wxid){
        let data = [ChatRoomWxid,  ticket,  Inviter,  Wxid]
        return this.__call__('ApproveAddChatroomMember', data)
    }
    /**
     * 从服务器获取群成员建议不要频繁使用
     * @param {string} ChatRoomWxid  群wxid
     */
    GetChatroomMemberDetail(ChatRoomWxid){
        let data = [ChatRoomWxid]
        return this.__call__('GetChatroomMemberDetail', data)
    }
    /**
     * 发朋友圈
     * @param {string} text 文字
     * @param {string} imgs 图片，Web调用时多个图片使用英文逗号分隔
     */
    mmsnspost( text,  imgs = null){
        let data = [text,  imgs]
        return this.__call__('mmsnspost', data)
    }
    /**
     * 获取朋友圈
     * @param {ulong} start 偏移量，可以循环读取所有朋友圈数据
     */
    mmsnstimeline( start = 0){
        let data = [start]
        return this.__call__('mmsnstimeline', data)
    }
    /**
     * 获取指定用户朋友圈
     * @param {string} wxid 
     * @param {ulong} start 偏移量，可以循环读取所有朋友圈数据
     */
    mmsnsuserpage(wxid, start = 0){
        let data = [wxid,start]
        return this.__call__('mmsnsuserpage', data)
    }
    /**
     * 删除朋友圈
     * @param {ulong} Id  postId
     */
    mmsnsobjectop(Id){
        let data = [Id]
        return this.__call__('mmsnsobjectop', data)
    }
    /**
     * 评论
     * @param {ulong} Id  被评论的postId
     * @param {string} WxId 被评论人
     * @param {string} NickName  被评论人
     * @param {string} Text  评论为空时点赞
     */
    mmsnscomment( Id,  WxId,  NickName,  Text = null){
        let data = [Id,  WxId,  NickName,  Text]
        return this.__call__('mmsnscomment', data)
    }

}