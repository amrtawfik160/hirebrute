import { APP_PORT_API } from "../shared/constants.ts"
import { createApp } from "./app.ts"
import { loadStore } from "./store.ts"

const port = Number(process.env.JOBDESK_API_PORT || process.env.API_PORT || APP_PORT_API)
const app = createApp()
loadStore()

app.listen(port, "127.0.0.1", () => {
  console.log(`Hirebrute API http://127.0.0.1:${port}`)
})
