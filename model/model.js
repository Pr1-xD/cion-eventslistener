const mongoose = require('mongoose');

const order = new mongoose.Schema({
    type: {
        required: true,
        type: String
    },
    account: {
        required: true,
        type: String
    },
    index: {
        required: true,
        type: String
    },
    status: {
        required: true,
        type: String
    },
    createdTimestamp: {
        required: true,
        type: Number
    }
    
})

const action = new mongoose.Schema({
    blockNumber: {
        required: true,
        type: Number
    },
    action: {
        required: true,
        type: String
    },
    account: {
        required: true,
        type: String
    },
    txhash: {
        required: true,
        type: String
    }
    // timestamp: {
    //     required: true,
    //     type: Number
    // }
    
})

const position = new mongoose.Schema({
    account: {
        required: true,
        type: String
    },
    initialPosition: {
        required: true,
        type: Object
    }
    // indexToken: {
    //     required: true,
    //     type: String
    // },
    // collateralToken: {
    //     required: true,
    //     type: String
    // },
    // isLong: {
    //     required: true,
    //     type: Boolean
    // }
    
})

const userStat = new mongoose.Schema({
    id: {
        required: true,
        type: String
    },
    uniqueCount: {
        required: true,
        type: Number
    }
    
})

const lastBlock = new mongoose.Schema({
    orderBook: {
        required: true,
        type: Number
    },
    positionRouter: {
        required: true,
        type: Number
    }
    
})

const orderStat = new mongoose.Schema({
    openSwap: {
        required: true,
        type: Number
    },
    openIncrease: {
        required: true,
        type: Number
    },
    openDecrease: {
        required: true,
        type: Number
    },
    executedSwap: {
        required: true,
        type: Number
    },
    executedIncrease: {
        required: true,
        type: Number
    },
    executedDecrease: {
        required: true,
        type: Number
    },
    cancelledSwap: {
        required: true,
        type: Number
    },
    cancelledIncrease: {
        required: true,
        type: Number
    },
    cancelledDecrease: {
        required: true,
        type: Number
    }
    
})

const positionStat = new mongoose.Schema({
    totalLongPositionSizes: {
        required: true,
        type: String
    },
    totalActivePositions: {
        required: true,
        type: Number
    },
    totalLongPositionCollaterals: {
        required: true,
        type: String
    },
    totalShortPositionCollaterals: {
        required: true,
        type: String
    },
    totalShortPositionSizes: {
        required: true,
        type: String
    },
})

Order = mongoose.model('Order', order)
UserStat = mongoose.model('UserStat', userStat)
OrderStat = mongoose.model('OrderStat', orderStat)
Position = mongoose.model('Position', position)
PositionStat = mongoose.model('PositionStat', positionStat)
Action = mongoose.model('Action', action)
LastBlock = mongoose.model('LastBlock', lastBlock)


module.exports = {Order,OrderStat,UserStat,Position,PositionStat,Action,LastBlock}