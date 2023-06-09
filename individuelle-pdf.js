#!/usr/bin/node

const fs = require("fs")
const path = require("path")
const cp = require("child_process")

const musescoreBinPath = path.resolve(process.argv[2])
const notebibliotekPath = path.resolve(process.argv[3])
const globalOutPath = path.resolve(process.argv[4])

const writePdf = (pdfPath, filePath) => {
    cp.spawnSync(musescoreBinPath, ["-o", pdfPath, filePath], {stdio: [process.stdin, process.stdout, process.stderr]})
}

// Gjør ikke fancy rekursive greier. Enn så lenge kan vi leve med antagelsen om en nokså flat mappestruktur
const dirs = fs.readdirSync(notebibliotekPath)
    .map(it => ({folder: it, fullPath:  path.resolve(notebibliotekPath, it)}))
    .filter(it => fs.lstatSync(it.fullPath).isDirectory())
    .filter(it => it.fullPath !== globalOutPath)

for (const {folder, fullPath} of dirs) {
    const outPath = path.resolve(globalOutPath, folder)

    fs.mkdirSync(outPath, {recursive: true})
    // Alle filer i out-mappa er kandidater for å ryddes opp etterpå
    const filesToCleanUp = new Set(fs.readdirSync(outPath).map(it => path.resolve(outPath, it)))

    // Alle musescore-filer skal PDF-ifiseres
    const files = fs.readdirSync(fullPath).filter(it => /\.msc(x|z)$/.test(it))
    for (const file of files) {
        const filePath = path.resolve(fullPath, file)
        // PDF-en skal hete det samme som musescore-fila
        const pdfPath = path.resolve(outPath, `${path.parse(file).name}.pdf`)

        // PDF-er vi faktisk lager nå skal ikke ryddes opp etterpå
        filesToCleanUp.delete(pdfPath)

        if (!fs.existsSync(pdfPath)) {
            console.log(`*** PDF finnes ikke, lager (${file}) `)
            writePdf(pdfPath, filePath)
        } else if (fs.statSync(filePath).mtime.getTime() > fs.statSync(pdfPath).mtime.getTime()) {
            console.log(`*** Musescore-fil har endringer, lager ny PDF (${file})`)
            writePdf(pdfPath, filePath)
        }
    }

    // Fjern alle løsgjenger-filer som eventuelt ligger og slenger i mappa
    for (const file of filesToCleanUp) {
        console.log(`*** PDF finnes men ikke Musesecore-fil, sletter PDF (${file})`)
        fs.rmSync(file)
    }
}