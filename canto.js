const contracts = require('./contracts')

const express = require('express');
const mongoose = require('mongoose');

require('dotenv').config();

const mongoString = process.env.DATABASE_URL

mongoose.connect(mongoString);
const database = mongoose.connection

database.on('error', (error) => {
    console.log(error)
})

database.once('connected', () => {        //db connection
    console.log('Database Connected');
})

const {Order,OrderStat,UserStat,Position,PositionStat,Action,LastBlock} = require('./model/model');      //importing models

const app = express();

app.use(express.json());

app.listen(5000, () => {
    console.log(`Server Started at ${5000}`)                                //port 3000
})

const Web3 = require('web3');

const jsonRpcURL = 'https://canto.slingshot.finance/'  // HTTP socket for Arbitrum
const web3 = new Web3(jsonRpcURL)

function getContractDetails(contractName)               // Gets contract ABI and address from contracts.js
{
    let obj = contracts.contracts.find(x => x.contractName === contractName)
    return obj
}

setInterval(blockUpdater,10000)                          // Loop script after interval

async function blockUpdater()                           // Gets latest block
{   
    let startBlock = await LastBlock.findById('6455072bbd8efae823ddcef5')
    console.log(startBlock)
    readOrderBook(startBlock.orderBook)
    readPositionRouter(startBlock.positionRouter)
    // web3.eth.getBlockNumber().then(readPositionRouter);
    // web3.eth.getBlockNumber().then(readOrderBook);
}


async function readContract(latestBlock) {              // sample contract events listener
  let contractDetails = getContractDetails('OrderBook')
  
  const abi = contractDetails.contractAbi
  const contractAddress = contractDetails.contractAddress

  let MyContract = new web3.eth.Contract(abi, contractAddress);
  console.log("listening for events on ", contractAddress)
  console.log("starting block", latestBlock-200)


    let options = {
        filter: {
            value: []    
        },
        fromBlock:  latestBlock-200,                  //Number || "earliest" || "pending" || "latest"
        toBlock: latestBlock
    };  

    MyContract.getPastEvents('CreateDecreaseOrder', options)        // choose events to log
    .then(results => console.log(results))
    .catch(err => console.log(err));    

    web3.eth.getBlockNumber().then(console.log);
}

async function readOrderBook(startBlock) {             // Order Book Events Listener

  let contractDetails = getContractDetails('OrderBook')
  
  const abi = contractDetails.contractAbi
  const contractAddress = contractDetails.contractAddress

  let MyContract = new web3.eth.Contract(abi, contractAddress);
  console.log("listening for events on ", contractAddress)
  console.log("starting block", startBlock)


    let options = {                                     // Specify starting and ending block
        filter: {
            value: []    
        },
        fromBlock:  startBlock,                  //Number || "earliest" || "pending" || "latest"
        toBlock: "latest"
    };  

    // Check for all orders placed 

    MyContract.getPastEvents('CreateIncreaseOrder', options)            
    .then(results => ordersHandler(results))
    .catch(err => console.log(err));    

    MyContract.getPastEvents('CreateDecreaseOrder', options)
    .then(results => ordersHandler(results))
    .catch(err => console.log(err)); 

    MyContract.getPastEvents('CreateSwapOrder', options)
    .then(results => ordersHandler(results))
    .catch(err => console.log(err)); 

    MyContract.getPastEvents('ExecuteIncreaseOrder', options)
    .then(results => ordersHandler(results))
    .catch(err => console.log(err));   

    MyContract.getPastEvents('ExecuteDecreaseOrder', options)
    .then(results => ordersHandler(results))
    .catch(err => console.log(err));

    MyContract.getPastEvents('ExecuteSwapOrder', options)
    .then(results => ordersHandler(results))
    .catch(err => console.log(err));

    MyContract.getPastEvents('CancelIncreaseOrder', options)
    .then(results => ordersHandler(results))
    .catch(err => console.log(err));    

    MyContract.getPastEvents('CancelDecreaseOrder', options)
    .then(results => ordersHandler(results))
    .catch(err => console.log(err));    

    MyContract.getPastEvents('CancelSwapOrder', options)
    .then(results => ordersHandler(results))
    .catch(err => console.log(err)); 
    
    latestBlock= await web3.eth.getBlockNumber()
    await LastBlock.findByIdAndUpdate('6455072bbd8efae823ddcef5',{orderBook:latestBlock})
    web3.eth.getBlockNumber().then(console.log);        // Logs the latest updated block
}

async function ordersHandler(newOrders)         // Handles all new orders logged
{
    newOrders.forEach(orderAction)
    newOrders.forEach(updateOrderStat)
    newOrders.forEach(addressChecker)
} 

async function orderAction(value)               // Handles orders based on action
{
    console.log(value)
    if(value.event === 'CreateIncreaseOrder')
    {
        await addOrder("increase",value.address,value.returnValues.orderIndex,"open",value.blockNumber)
        console.log('Order Added')
    }
    if(value.event === 'CreateDecreaseOrder')
    {
        await addOrder("decrease",value.address,value.returnValues.orderIndex,"open",value.blockNumber)
        console.log('Order Added')
    }
    if(value.event === 'CreateSwapOrder')
    {
        await addOrder("swap",value.address,value.returnValues.orderIndex,"open",value.blockNumber)
        console.log('Order Added')
    }
    if(value.event === 'CancelDecreaseOrder' || value.event === 'CancelIncreaseOrder' || value.event === 'CancelSwapOrder' )
    {
        await updateOrder(value.returnValues.orderIndex,"cancelled")
        console.log('Order Cancelled')
    }
    if(value.event === 'ExecuteDecreaseOrder' || value.event === 'ExecuteIncreaseOrder' || value.event === 'ExecuteSwapOrder' )
    {
        await updateOrder(value.returnValues.orderIndex,"executed")
        console.log('Order Cancelled')
    }
    
    
}

async function addOrder(type,account,index,status,timestamp)       // Add Order to DB
{
    const data = new Order({
        "type": type,
        "account": account,
        "index": index,
        "status": status,
        "createdTimestamp": timestamp
      })

    try {
        const dataToSave = await data.save();
        console.log(dataToSave)
    }
    catch (error) {
        console.log(error)
    }
}

async function updateOrder(index,newStatus)       // Updates status of order
{
    try {
        const newData = await Order.findOneAndUpdate({index: index},{status:newStatus})
        console.log(newData)
    }
    catch (error) {
        console.log(error)
    }
}

async function updateOrderStat(value)       //Updates the stats for orders
{   
    if(value.event === 'CreateIncreaseOrder')
    {   
        try{
            await OrderStat.findByIdAndUpdate('644852d23965e145194ac7a7',{$inc:{openIncrease:1}})
            addAction('CreateIncreaseOrder',value.blockNumber,value.returnValues.account,value.transactionHash)
            console.log('Count Updated')
        }
        catch(err){
            console.log(err)
        }  
    }
    if(value.event === 'CreateDecreaseOrder')
    {   
        try{
            await OrderStat.findByIdAndUpdate('644852d23965e145194ac7a7',{$inc:{openDecrease:1}})
            addAction('CreateDecreaseOrder',value.blockNumber,value.returnValues.account,value.transactionHash)
            console.log('Count Updated')
        }
        catch(err){
            console.log(err)
        }  
    }
    if(value.event === 'CreateSwapOrder')
    {   
        try{
            await OrderStat.findByIdAndUpdate('644852d23965e145194ac7a7',{$inc:{openSwap:1}})
            addAction('Swap',value.blockNumber,value.returnValues.account,value.transactionHash)
            console.log('Count Updated')
        }
        catch(err){
            console.log(err)
        }  
    }
    if(value.event === 'ExecuteIncreaseOrder')
    {   
        try{
            await OrderStat.findByIdAndUpdate('644852d23965e145194ac7a7',{$inc:{executedIncrease:1}})
            addAction('ExecuteIncreaseOrder',value.blockNumber,value.returnValues.account,value.transactionHash)
            console.log('Count Updated')
        }
        catch(err){
            console.log(err)
        }  
    }
    if(value.event === 'ExecuteDecreaseOrder')
    {   
        try{
            await OrderStat.findByIdAndUpdate('644852d23965e145194ac7a7',{$inc:{executedDecrease:1}})
            addAction('ExecuteDecreaseOrder',value.blockNumber,value.returnValues.account,value.transactionHash)
            console.log('Count Updated')
        }
        catch(err){
            console.log(err)
        }  
    }
    if(value.event === 'ExecuteSwapOrder')
    {   
        try{
            await OrderStat.findByIdAndUpdate('644852d23965e145194ac7a7',{$inc:{executedSwap:1}})
            addAction('ExecuteSwapOrder',value.blockNumber,value.returnValues.account,value.transactionHash)
            console.log('Count Updated')
        }
        catch(err){
            console.log(err)
        }  
    }
    if(value.event === 'CancelIncreaseOrder')
    {   
        try{
            await OrderStat.findByIdAndUpdate('644852d23965e145194ac7a7',{$inc:{cancelledIncrease:1}})
            addAction('CancelIncreaseOrder',value.blockNumber,value.returnValues.account,value.transactionHash)
            console.log('Count Updated')
        }
        catch(err){
            console.log(err)
        }  
    }
    if(value.event === 'CancelDecreaseOrder')
    {   
        try{
            await OrderStat.findByIdAndUpdate('644852d23965e145194ac7a7',{$inc:{cancelledDecrease:1}})
            addAction('CancelDecreaseOrder',value.blockNumber,value.returnValues.account,value.transactionHash)
            console.log('Count Updated')
        }
        catch(err){
            console.log(err)
        }  
    }
    if(value.event === 'CancelSwapOrder')
    {   
        try{
            await OrderStat.findByIdAndUpdate('644852d23965e145194ac7a7',{$inc:{cancelledSwap:1}})
            addAction('CancelSwapOrder',value.blockNumber,value.returnValues.account,value.transactionHash)
            console.log('Count Updated')
        }
        catch(err){
            console.log(err)
        }  
    }
    
}


/////////////////////////
/////////////////////////
/////////////////////////
/////////////////////////
////   Position   ///////
/////////////////////////
/////////////////////////
/////////////////////////
/////////////////////////

async function readPositionRouter(startBlock) {
    let contractDetails = getContractDetails('PositionRouter')
    
    const abi = contractDetails.contractAbi
    const contractAddress = contractDetails.contractAddress
  
    let MyContract = new web3.eth.Contract(abi, contractAddress);
    console.log("listening for events on ", contractAddress)
    console.log("starting block", startBlock)
  
  
      let options = {
          filter: {
              value: []    
          },
          fromBlock:  startBlock,                  //Number || "earliest" || "pending" || "latest"
          toBlock: "latest"
      };  
  
      MyContract.getPastEvents('CreateIncreasePosition', options)
      .then(results => positionsHandler(results))
      .catch(err => console.log(err));    
  
      MyContract.getPastEvents('CreateDecreasePosition', options)
      .then(results => positionsHandler(results))
      .catch(err => console.log(err)); 
  
      MyContract.getPastEvents('ExecuteIncreasePosition', options)
      .then(results => positionsHandler(results))
      .catch(err => console.log(err));   
  
      MyContract.getPastEvents('ExecuteDecreasePosition', options)
      .then(results => positionsHandler(results))
      .catch(err => console.log(err));
  
      MyContract.getPastEvents('CancelIncreasePosition', options)
      .then(results => positionsHandler(results))
      .catch(err => console.log(err));    
  
      MyContract.getPastEvents('CancelDecreasePosition', options)
      .then(results => positionsHandler(results))
      .catch(err => console.log(err));       
      
      latestBlock= await web3.eth.getBlockNumber()
      await LastBlock.findByIdAndUpdate('6455072bbd8efae823ddcef5',{positionRouter:latestBlock})
      web3.eth.getBlockNumber().then(console.log);
  }



async function positionsHandler(newPositions)         // Handles all new orders logged
{
    newPositions.forEach(positionAction)
    newPositions.forEach(handlePositionForAction)
    // newPositions.forEach(addressChecker)
}  



async function positionAction(value)
{
    console.log(value)
    if(value.event === 'CreateIncreasePosition' || value.event === 'CreateDecreasePosition')
    {   
        await addPositon(value.returnValues.account,value.returnValues.indexToken,value.returnValues.path[0],value.returnValues.isLong)
        console.log('Position Added')
    }

}

async function handlePositionForAction(value)
{
    if(value.event === 'CreateIncreasePosition')
    {   
        try{
            // await OrderStat.findByIdAndUpdate('644852d23965e145194ac7a7',{$inc:{openIncrease:1}})
            addAction('CreateIncreasePosition',value.blockNumber,value.returnValues.account,value.transactionHash)
            // console.log('Count Updated')
        }
        catch(err){
            console.log(err)
        }  
    }
    if(value.event === 'CreateDecreasePosition')
    {   
        try{
            // await OrderStat.findByIdAndUpdate('644852d23965e145194ac7a7',{$inc:{openIncrease:1}})
            addAction('CreateDecreasePosition',value.blockNumber,value.returnValues.account,value.transactionHash)
            // console.log('Count Updated')
        }
        catch(err){
            console.log(err)
        }  
    }
    if(value.event === 'ExecuteDecreasePosition')
    {   
        try{
            // await OrderStat.findByIdAndUpdate('644852d23965e145194ac7a7',{$inc:{openIncrease:1}})
            if(value.returnValues.isLong)
            addAction('DecreasePosition-Long',value.blockNumber,value.returnValues.account,value.transactionHash)
            else
            addAction('DecreasePosition-Short',value.blockNumber,value.returnValues.account,value.transactionHash)
            // console.log('Count Updated')
        }
        catch(err){
            console.log(err)
        }  
    }
    if(value.event === 'ExecuteIncreasePosition')
    {   
        try{
            // await OrderStat.findByIdAndUpdate('644852d23965e145194ac7a7',{$inc:{openIncrease:1}})
            if(value.returnValues.isLong)
            addAction('IncreasePosition-Long',value.blockNumber,value.returnValues.account,value.transactionHash)
            else
            addAction('IncreasePosition-Short',value.blockNumber,value.returnValues.account,value.transactionHash)
            // console.log('Count Updated')
        }
        catch(err){
            console.log(err)
        }  
    }
}






async function addressChecker(value)        // Checks for new users and updates DB
{
    try{
        let res = await Order.findOne({account:value.address})
        if(res)
        {
            console.log('Returning Address')
        }
        else
        {
            console.log('New Address')
            await UserStat.findByIdAndUpdate("total",{$inc:{uniqueCount:1}})
        }
        
    }
    catch(err){
        console.log(err)
    } 
    
}

async function addUserStat()       // sample user stat updater
{
    const data = new UserStat({
        "id": "total",
        "uniqueCount": 248531
      })

    try {
        const dataToSave = await data.save();
        console.log(dataToSave)
    }
    catch (error) {
        console.log(error)
    }
}

async function addPositon(account,indexToken,collateralToken,isLong)       //need to add parameters later and change to just update value based on parameters
{
    const data = new Position({
            "account": account,
            "initialPosition":{
                "indexToken": indexToken,
                "collateralToken": collateralToken,
                "isLong": isLong
            }
            
        })

    try {
        const dataToSave = await data.save();
        console.log(dataToSave)
    }
    catch (error) {
        console.log(error)
    }
}

async function addAction(action,blockNumber,account,txhash)       //need to add parameters later and change to just update value based on parameters
{
    const data = new Action(
        {
            "blockNumber": blockNumber,
            "action": action,
            "account": account,
            "timestamp": "1682459040",
            "txhash": txhash
            })

    try {
        const dataToSave = await data.save();
        console.log(dataToSave)
    }
    catch (error) {
        console.log(error)
    }
}

// add event listener functions
// make functions for performing actions on events logged
