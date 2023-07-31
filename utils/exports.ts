import * as xlsx from "xlsx"

export function prepareWorkBook() {
    const book = xlsx.utils.book_new()
    return { book }
}

export function appendContentWorkBook({ book, sheet, messages, sheet_name = "sheet1", columns, labels }: { book: xlsx.WorkBook, sheet?: xlsx.Sheet, messages: Array<any>, sheet_name?: string, columns?: Array<any>, labels?: Array<any> }) {
    if (sheet) {
        xlsx.utils.sheet_add_json(sheet, messages, { origin: -1, header: columns, skipHeader: true })
    }
    else {
        if (labels) {
            sheet = xlsx.utils.aoa_to_sheet(labels)
            xlsx.utils.sheet_add_json(sheet, messages, { origin: -1, header: columns, skipHeader: true })
        } else {
            sheet = xlsx.utils.json_to_sheet(messages, { header: columns })
        }
        xlsx.utils.book_append_sheet(book, sheet, sheet_name)
    }
    return { book, sheet }
}

export function writeWorkBook({ book, output = "export.xlsx" }: { book: xlsx.WorkBook, output?: string }) {
    xlsx.writeFile(book, output)
}