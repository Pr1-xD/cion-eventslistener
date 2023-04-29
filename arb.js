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

database.once('connected', () => {
    console.log('Database Connected');
})

const {Order, OrderStat,UserStat,Position} = require('./model/model');

const app = express();

app.use(express.json());

app.listen(3000, () => {
    console.log(`Server Started at ${3000}`)
})

const Web3 = require('web3');

const jsonRpcURL = 'https://arb-mainnet.g.alchemy.com/v2/BrrBgtgC2aUEU_TLB0mb3ADa0PrFzDfO'  
const web3 = new Web3(jsonRpcURL)

function getContractDetails(contractName)
{
    let obj = contracts.contracts.find(x => x.contractName === contractName)
    return obj
}

setInterval(blockUpdater,6000)

async function blockUpdater()
{
    web3.eth.getBlockNumber().then(readOrderBook);
}


async function readContract(latestBlock) {
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

    MyContract.getPastEvents('CreateDecreaseOrder', options)
    .then(results => console.log(results))
    .catch(err => console.log(err));    

    web3.eth.getBlockNumber().then(console.log);
}

async function readOrderBook(latestBlock) { 

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
        fromBlock:  latestBlock-2000,                  //Number || "earliest" || "pending" || "latest"
        toBlock: latestBlock
    };  

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
    

    web3.eth.getBlockNumber().then(console.log);
}

async function readPositionRouter(latestBlock) {
    let contractDetails = getContractDetails('PositionRouter')
    
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
  
      MyContract.getPastEvents('CreateIncreasePosition', options)
      .then(results => console.log(results))
      .catch(err => console.log(err));    
  
      MyContract.getPastEvents('CreateDecreasePosition', options)
      .then(results => console.log(results))
      .catch(err => console.log(err)); 
  
      MyContract.getPastEvents('ExecuteIncreasePosition', options)
      .then(results => console.log(results))
      .catch(err => console.log(err));   
  
      MyContract.getPastEvents('ExecuteDecreasePosition', options)
      .then(results => console.log(results))
      .catch(err => console.log(err));
  
      MyContract.getPastEvents('CancelIncreasePosition', options)
      .then(results => console.log(results))
      .catch(err => console.log(err));    
  
      MyContract.getPastEvents('CancelDecreasePosition', options)
      .then(results => console.log(results))
      .catch(err => console.log(err));       
  
      web3.eth.getBlockNumber().then(console.log);
  }

async function ordersHandler(newOrders)
{
    newOrders.forEach(orderAction)
    newOrders.forEach(updateOrderStat)
}  

async function orderAction(value)
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

async function addOrder(type,account,index,status,timestamp)       //need to add parameters later
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

async function updateOrder(index,newStatus)       //need to add parameters later
{
    try {
        const newData = await Order.findOneAndUpdate({index: index},{status:newStatus})
        console.log(newData)
    }
    catch (error) {
        console.log(error)
    }
}


async function updateOrderStat(value)       //need to add parameters later and change to just update value based on parameters
{   
    if(value.event === 'CreateIncreaseOrder')
    {   
        try{
            await OrderStat.findByIdAndUpdate('644852d23965e145194ac7a7',{$inc:{openIncrease:1}})
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
            console.log('Count Updated')
        }
        catch(err){
            console.log(err)
        }  
    }
    


}

async function addUserStat()       //need to add parameters later and change to just update value based on parameters
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

async function addPositon()       //need to add parameters later and change to just update value based on parameters
{
    const data = new Position({
            "account": "0x0faa687dc8ca357e4aa4866aa10f9eca193d979b",
            "indexToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
            "collateralToken": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
            "isLong": true
        })

    try {
        const dataToSave = await data.save();
        console.log(dataToSave)
    }
    catch (error) {
        console.log(error)
    }
}

async function addAction()       //need to add parameters later and change to just update value based on parameters
{
    const data = new Action(
        {
            "blockNumber": 84277956,
            "action": "CreateIncreaseOrder",
            "account": "0xb9C5bdcf39b10c308d518F81CAC91d3F13c7a6df",
            "timestamp": "1682459040",
            "txhash": "0x0fe0207eec8ca401b25a693cdf477547c80c56ec8fa7d9de47bbb9aeb1c18f8c"
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
