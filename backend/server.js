const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const User = require('./models/user.model')
const jwt = require('jsonwebtoken')
const path = require('path')
var serveStatic = require('serve-static')

dotenv.config()

const app = express()
app.use(serveStatic(path.join(process.cwd(), '/dist')))
app.get(
  [
    '/',
    '/dashboard',
    '/dashboard/*',
    '/login',
    '/signUp',
    '/about',
    '/faqs',
    '/contact',
    '/admin'
  ],
  (req, res) => res.sendFile(path.join(process.cwd(), '/dist/index.html'))
)
app.use('/static', express.static('dist/static'))

const port = process.env.PORT

app.use(cors())
app.use(express.json())

mongoose.connect(process.env.ATLAS_URI)

app.post('/api/register', async (req, res) => {
  try {
    await User.create({
      firstname: req.body.firstName,
      lastname: req.body.lastName,
      email: req.body.email,
      password: req.body.password,
      funded: 0,
      investment: 0,
      transaction: 0,
      withdraw: 0,
      lapTime: 0
    })
    return res.json({ status: 'ok' })
  } catch (error) {
    console.log(error)
    return res.json({ status: 'error', error: 'duplicate email' })
  }
})
app.get('/api/getData', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })
    res.json({
      status: 'ok',
      name: user.firstname,
      email: user.email,
      funded: user.funded,
      invest: user.investment,
      transaction: user.transaction,
      withdraw: user.withdraw
    })
  } catch (error) {
    res.json({ status: 'error' })
  }
})

app.post('/api/fundwallet', async (req, res) => {
  try {
    const email = req.body.email
    const incomingAmount = req.body.amount
    const user = await User.findOne({ email: email })
    await User.updateOne(
      { email: email },
      {
        funded: incomingAmount + user.funded,
        transaction: user.transaction + 1
      }
    )
    res.json({ status: 'ok', funded: req.body.amount })
  } catch (error) {
    console.log(error)
    res.json({ status: 'error' })
  }
})

app.post('/api/invest', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })

    const money = (() => {
      switch (req.body.amount.percent) {
        case '14%':
          return (req.body.amount.value * 14) / 100
        case '28%':
          return (req.body.amount.value * 28) / 100
        case '35%':
          return (req.body.amount.value * 35) / 100
      }
    })()
    console.log(money)
    const date = new Date()
    if (
      req.body.amount.value >= req.body.amount.min &&
      req.body.amount.value <= req.body.amount.max
    ) {
      if (user.funded > req.body.amount.value) {
        await User.updateOne(
          { email: email },
          {
            $set: {funded: user.funded - req.body.amount.value}
          }
        )
        await User.updateOne(
          { email: email },
          {
            $set: {investment: req.body.amount.value + money}
          }
        )
        await User.updateOne(
          { email: email },
          {
            $set: {lapTime: date.getTime()}
          }
        )
        res.json({ status: 'ok', amount: money })
        return { status: 'ok' }
      } else {
        res.json({
          message: 'you do not have sufficient amount in your account'
        })
      }
    } else {
      res.json({
        status: 'error',
        message: ' you entered an amount either less or beyond investmet range'
      })
    }
  } catch (error) {
    res.json({ status: 'error' })
  }
})

app.post('/api/withdraw', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })
    if (user.funded >= req.body.WithdrawAmount) {
      await User.updateOne(
        { email: email },
        { $set: { funded: user.funded - req.body.WithdrawAmount } }
      )
      await User.updateOne(
        { email: email },
        { $set: { withdraw: user.withdraw + req.body.WithdrawAmount } }
      )
      res.json({ status: 'ok', withdraw: req.body.WithdrawAmount })
      console.log({ status: req.body.WithdrawAmount })
    } else {
      res.json({ message: 'you do not have sufficient amount in your account' })
    }
  } catch (error) {
    console.log(error)
    res.json({ status: 'error' })
  }
})

app.post('/api/login', async (req, res) => {
  const user = await User.findOne({
    email: req.body.email,
    password: req.body.password
  })
  if (user) {
    const token = jwt.sign(
      {
        email: user.email,
        password: user.password
      },
      'secret1258'
    )
    return res.json({ status: 'ok', user: token })
  } else {
    return res.json({ status: 'error', user: false })
  }
})

app.get('/api/getUsers', async (req, res) => {
  const users = await User.find()
  res.json(users)
  console.log(users)
})

// const change = (users, now) => {
//   users.forEach(async (user) => {
//     if (user.funded > 0) {
//       await User.updateOne(
//         { email: user.email },
//         {
//           investment: user.investment + 100
//         }
//       )
//       console.log(`laptime: ${user.lapTime} now:${now}`)
//     }
//   })
// }

// setInterval(async () => {
//   const users = (await User.find()) ?? []
//   const now = Date.now()
//   change(users, now)
// }, 600000)

closeInterval=(users,now)=>{
  users.forEach(async(user) =>{
    if(user.funded > 0 && now - 60480000 <= user.lapTime){
    await User.updateOne(
      { email: user.email },
      {funded: user.funded + user.investment,
        investment: 0
      })}
})}
setInterval(async() => {
  const d = new Date
  const now = d.getTime()
  const users = await User.find()
  closeInterval(users,now)
}, 60480000);
app.listen(port, () => {
  console.log(`server is running on port: ${port}`)
})
