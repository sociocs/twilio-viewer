import xlsx from "xlsx"

export function prepareWorkBook() {
    const book = xlsx.utils.book_new()
    return { book }
}

export function appendContentWorkBook({ book, sheet, messages }: { book: xlsx.WorkBook, sheet?: xlsx.Sheet, messages: Array<any> }) {
    if (sheet) {
        xlsx.utils.sheet_add_json(sheet, messages)
    }
    else {
        sheet = xlsx.utils.json_to_sheet(messages)
    }
    return { book, sheet }
}

export function writeWorkBook({ book }: { book: xlsx.WorkBook, sheet: xlsx.Sheet }) {
    // xlsx.writeFile(book, './file.xlsx')
}