import { program } from 'commander'
import { Driver, getCredentialsFromEnv } from 'ydb-sdk'
import { cleanup } from './cleanup'
import { create } from './create'
import { readJob } from './readJob'

const defaultArgs = (p: typeof program) => {
  return p
    .argument('<endpoint>', 'YDB endpoint to connect to')
    .argument('<db>', 'YDB database to connect to')
}

async function createDriver(endpoint: string, database: string): Promise<Driver> {
  const authService = getCredentialsFromEnv()
  console.log('Driver initializing...')
  const driver = new Driver({ endpoint, database, authService })
  const timeout = 30000
  if (!(await driver.ready(timeout))) {
    console.log(`Driver has not become ready in ${timeout}ms!`)
    process.exit(1)
  }
  console.log('Initialized succesfully')
  return driver
}

interface ICreateOptions {
  tableName?: string
  partitionCount?: string
  initialDataCount?: string
}

function main() {
  program
    .name('slo-nodejs-workload')
    .description('Node.js util to run SLO workload over YDB cluster. Uses credentials from env.')

  // create
  defaultArgs(program.command('create'))
    .option('-t --table-name <tableName>', 'table name to create')
    .option('-p --partitions-count <partitionCount>', 'amount of partitions in table creation')
    .option('-c --initial-data-count <initialDataCount>', 'amount of initially created rows')
    .action(
      async (endpoint, db, { tableName, partitionCount, initialDataCount }: ICreateOptions) => {
        console.log('Run create over', endpoint, db, tableName, partitionCount, initialDataCount)

        create(await createDriver(endpoint, db), tableName, partitionCount, initialDataCount)
      }
    )

  defaultArgs(program.command('cleanup'))
    .option('-t --table-name <tableName>', 'table name to create')
    .action(async (endpoint, db, { tableName }) => {
      console.log('Run cleanup over', endpoint, db, tableName)
      cleanup(await createDriver(endpoint, db), tableName)
    })

  defaultArgs(program.command('run'))
    .option('-t --table-name <tableName>', 'table name to read from')
    .option('-t --read-rps <readRPS>', 'read RPS')
    .option('-t --read-timeout <readTimeout>', 'read timeout')
    .option('-t --time <time>', 'read time')
    .action(async (endpoint, db, { tableName, readRPS, readTimeout, time }) => {
      console.log('Run workload over', endpoint, db, tableName)
      readJob(await createDriver(endpoint, db), tableName, readRPS, readTimeout, time)
    })

  program.parse()
}

main()
