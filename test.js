
const ls = new LibSocket()

const main = async () => {
    console.info(ls)
    setTimeout(() => {
        console.info(ls)
        console.info(ls.onData((res) => {
            console.info('ls onData', res)
        }))
        ls.start()
    },100)
}

main()