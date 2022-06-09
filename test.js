import EventTrack from './lib/index.js'

const eventTrack = new EventTrack({
    acceptEventType: ['onLaunch', 'onLoad', 'onShow', 'click', 'request', 'onError'],
    sendTimeout: 1000 * 5,
    sendQueueSize: 30,
    singleModel: true,
    sendFn: (e) => {
        console.log(e)
    },
    getCurrentPage: () => 'xxx',
    getInitialEventContent: () => {
        return {
            appInfo: {},
            systemInfo: {},
            userInfo: {},
        }
    }
})

eventTrack.init()

eventTrack.updateInitialEventContent({
    key: 'userInfo',
    value: {
        openId: 'xx',
        userId: 'xxxxx'
    }
})

eventTrack.track({
    eventType: 'onLoad'
})

eventTrack.track({
    eventType: 'click',
    elemId: 'elem-id',
})

eventTrack.track({
    eventType: 'click1',
    elemId: 'elem-id2',
})

const logEventExample = {
    eventType: 'click',
    elemId: 'elem-id',
    createTime: Date.now(),
    extraParams: {
        ABtestId: 'xxxx',
    }
}