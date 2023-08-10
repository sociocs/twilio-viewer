import * as xlsx from "xlsx"

export function prepareWorkBook() {
    const book = xlsx.utils.book_new()
    return { book }
}

export function appendContentWorkBook({ book, sheet, messages, sheet_name = "sheet1", headers }: { book: xlsx.WorkBook, sheet?: xlsx.Sheet, messages: Array<any>, sheet_name?: string,headers: Array<any> }) {

    let columns = headers.map(h => Object.keys(h)[0]) // column headers

    // set keys not in the header list as undefined
    let processed_messages = messages.map(m => {
        for(const key of Object.keys(m)){
            if(!columns.includes(key)){
                m[key] = undefined
            }
        }
        return m
    })

    if (sheet) {
        // for existing sheet, just add the json array
        xlsx.utils.sheet_add_json(sheet, processed_messages, { origin: -1, header: columns, skipHeader: true })
    }
    else {
        // if sheet is not existing, 
        // create a new sheet with column headers
        let labels = headers.map(h => Object.values(h)[0])
        sheet = xlsx.utils.aoa_to_sheet([labels])
        xlsx.utils.sheet_add_json(sheet, processed_messages, { origin: -1, header: columns, skipHeader: true })
        xlsx.utils.book_append_sheet(book, sheet, sheet_name)
    }
    return { book, sheet }
}

export function writeWorkBook({ book, output = "export.xlsx" }: { book: xlsx.WorkBook, output?: string }) {
    xlsx.writeFile(book, output)
}