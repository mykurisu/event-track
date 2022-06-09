export interface IAppInfo {
    appID: string
    version: string
    appName: string
    [key: string]: any
}

export interface ISystemInfo {
    ua: string
    [key: string]: any
}

export interface IUserInfo {
    deviceID: string
    [key: string]: any
}

export interface IInitialEventContent {
    key: string
    value: any
}

export interface IReportOptions {
    /* 允许上报的事件类型 */
    acceptEventType: string[]

    /* 上报函数触发间隔 */
    sendTimeout: number

    /* 上报队列最大数量 */
    sendQueueSize: number

    /**
     * 是否启动单日志上报模式
     * 如果启动单日志上报模式，则不会启动上报队列，其余特性不变
     */
    singleModel: boolean

    /* 使用方传入的上报方法，参数为待上报队列 */
    sendFn: (content: IReportContent) => void

    /* 获取当前页面路由 */
    getCurrentPage: () => string

    /* 获取默认上报内容 */
    getInitialEventContent: () => IInitiaReportContent
}

export interface IEvent {
    eventType: string
    elemId?: string
    createTime?: string
    extraParams?: object
}

export interface IInitiaReportContent {
    appInfo?: IAppInfo
    systemInfo?: ISystemInfo
    userInfo?: IUserInfo
}

export interface IReportContent extends IInitiaReportContent {
    items?: IEvent[]
    reportTime?: string
    [key: string]: any
}

/* 每次上报都会默认带上的内容 */
let defaultEventContent: IInitiaReportContent = {}

/* 埋点插件实例 */
class EventTrack {
    private reportOptions: IReportOptions
    private queue!: Queue
    private stack!: PageStack

    constructor (props: IReportOptions) {
        this.reportOptions = props
    }

    /* 埋点上报插件初始化方法 */
    init(cb?: () => void) {
        const { reportCreator } = this
        const { sendTimeout, sendQueueSize, singleModel, sendFn, getCurrentPage } = this.reportOptions
        this.queue = new Queue({ sendTimeout, sendQueueSize, singleModel, sendFn, reportCreator })
        if (!singleModel) {
            this.queue.begin()
        }
        this.stack = new PageStack({ getCurrentPage })
        defaultEventContent = this.reportOptions.getInitialEventContent()
        cb && cb()
    }

    /* 埋点上报方法 */
    track(event: IEvent) {
        const { eventType } = event

        /* 过滤未在init方法中初始化的事件上报 */
        if (this.reportOptions.acceptEventType.indexOf(eventType) === -1) return console.warn('EventTrack-未注册事件')

        if (eventType === 'onLoad') {
            this.stack.push()
        }

        const _evnet = {
            ...event,
            path: this.stack.getCurrentStack()
        }

        if (eventType === 'onUnLoad') {
            this.stack.pop()
        }

        if (!_evnet.createTime) _evnet.createTime = String(Date.now())
        this.queue.push(_evnet)
    }

    /* 日志生成方法 */
    reportCreator() {
        return {
            ...defaultEventContent,
            reportTime: String(Date.now()),
        }
    }

    /* 更新队列状态 */
    updateQueueStatus(status: boolean) {
        if (status) {
            return this.queue.begin()
        }
        this.queue.end()
    }

    /* 更新日志默认参数 */
    updateInitialEventContent(updateContent: IInitialEventContent) {
        const { key, value } = updateContent
        defaultEventContent[key] = value
    }

    /* 查询日志默认参数 */
    queryInitialEventContent() {
        return defaultEventContent
    }
}

/* 队列实例 */
class Queue {
    private isConsuming: boolean = false
    private eventQueue: IEvent[] = []
    private singleModel: boolean | undefined
    private sendTimeout!: number
    private sendQueueSize!: number
    private sendTimer!: NodeJS.Timer
    private sendFn!: (content: IReportContent) => void
    private reportCreator!: () => IReportContent

    constructor (props: {
        sendFn: (content: IReportContent) => void,
        reportCreator: () => IReportContent
        sendTimeout: number,
        sendQueueSize: number,
        singleModel: boolean | undefined,
    }) {
        const { sendTimeout, sendQueueSize, singleModel, sendFn, reportCreator } = props
        this.sendTimeout = sendTimeout
        this.sendQueueSize = sendQueueSize
        this.singleModel = singleModel
        this.sendFn = sendFn
        this.reportCreator = reportCreator
    }

    /* 队列启动方法 */
    begin() {
        const sendTimer = setInterval(() => {
            if (this.eventQueue.length > 0) {
                this.consume()
            }
            return
        }, this.sendTimeout)
        this.sendTimer = sendTimer;
        return sendTimer
    }

    /* 队列终止方法 */
    end() {
        if (this.sendTimer) {
            clearInterval(this.sendTimer)
        }
    }

    /* 日志推送方法 */
    push(event: IEvent) {
        /**
         * 在单日志上报模式下
         * push方法会直接消费日志
         */
        if (this.singleModel) {
            this.eventQueue.push(event)
            this.consume()
            return
        }
        /**
         * 当队列长度达到限制长度则先触发消费方法
         * 触发之后再将新日志推送入队列
         */
        if (this.eventQueue.length >= this.sendQueueSize) {
            this.consume()
        }
        this.eventQueue.push(event)
    }

    /* 队列消费方法 */
    consume() {
        if (this.isConsuming) return
        this.isConsuming = true
        const items = this.eventQueue.slice(0)
        this.eventQueue = []
        this.isConsuming = false
        this.sendFn({
            items,
            ...this.reportCreator()
        })
    }
}

/* 页面堆栈实例 */
class PageStack {
    private stack!: string[]
    private getCurrentPage: () => string

    constructor (props: {
        getCurrentPage: () => string
    }) {
        const { getCurrentPage } = props
        this.getCurrentPage = getCurrentPage
        this.stack = []
    }

    push() {
        this.stack.push(this.getCurrentPage())
    }

    pop() {
        this.stack.pop()
    }

    getCurrentStack() {
        const { stack } = this
        return stack[stack.length - 1]
    }
}

export default EventTrack
