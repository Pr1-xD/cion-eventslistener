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

// setInterval(blockUpdater,60000)

async function blockUpdater()
{
    web3.eth.getBlockNumber().then(readContract);
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
        fromBlock:  latestBlock-180,                  //Number || "earliest" || "pending" || "latest"
        toBlock: latestBlock
    };  

    MyContract.getPastEvents('CreateDecreaseOrder', options)
    .then(results => console.log(results))
    .catch(err => console.log(err));    

    web3.eth.getBlockNumber().then(console.log);
}

async function addOrder()       //need to add parameters later
{
    const data = new Order({
        "type": "increase",
        "account": "0xda0e58b51d0ebdeab4866ef054fb25a303dd9ccb",
        "index": "1702",
        "status": "open",
        "createdTimestamp": 1682458221
      })

    try {
        const dataToSave = await data.save();
        console.log(dataToSave)
    }
    catch (error) {
        console.log(error)
    }
}


async function addOrderStat()       //need to add parameters later and change to just update value based on parameters
{
    const data = new OrderStat({
        "openSwap": 197,
        "openIncrease": 489,
        "openDecrease": 6092,
        "executedSwap": 3938,
        "executedIncrease": 45415,
        "executedDecrease": 74680,
        "cancelledSwap": 3078,
        "cancelledIncrease": 47692,
        "cancelledDecrease": 121531
      })

    try {
        const dataToSave = await data.save();
        console.log(dataToSave)
    }
    catch (error) {
        console.log(error)
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

addAction()