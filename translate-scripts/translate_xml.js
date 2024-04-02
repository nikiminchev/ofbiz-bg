const {TranslationServiceClient} = require('@google-cloud/translate');
//const {Translate} = require('@google-cloud/translate').v2;

const xml2js = require('xml2js');


const projectId = 'boreal-atom-417804';
const location = 'global';

const translate = new TranslationServiceClient({   
	projectId: projectId, 
	key: '<YOUR-API-KEY>',
	});

//const puppeteer = require('puppeteer');


const langAttribute = 'xml:lang';

// Function to parse XML and extract text for translation
function parseXml(xmlData) {
  return new Promise((resolve, reject) => {
    const parser = new xml2js.Parser();
    parser.parseString(xmlData, (err, result) => {
      if (err) {
        reject(err);
      } else {
        const textToTranslate = []; // Array to store text for translation

		let kindex = 0;
        result.resource.property.forEach(property => {
			property.value.forEach(valueElement => {
				

				const lang = valueElement.$[langAttribute]; // Assuming 'xml:lang' attribute for language
				const text = valueElement._; // Access the actual text content
				
				const englishValue = lang==='en';
				const existingTranslations = lang !== 'en';

				if (englishValue) { // Process if English text exists
					textToTranslate.push(text);
				}

				//console.log(`Property: Language: ${lang}, Text: ${text}`);
				// You can add logic here to translate the text based on language (lang)
		  });
        });
		
        resolve(textToTranslate);
        //console.log('Extracted text for translation:', textToTranslate);
      }
      
    });
  });
}

// Function to translate text using chosen service API 
async function translateText(text) {
  
  // Construct request
  const request = {
    parent: `projects/${projectId}/locations/${location}`,
    contents: [text],
    mimeType: 'text/plain', // mime types: text/plain, text/html
    sourceLanguageCode: 'en',
    targetLanguageCode: 'bg',
  };

  // Run request
  const [response] = await translate.translateText(request);

  let translateText = null;
  for (const translation of response.translations) {
    console.log(`Translation: ${translation.translatedText}`);
    if(translateText===null){
		translateText = translation.translatedText;
	}
  }
  return translateText;
}

// Function to update XML with translated text
function updateXml(xmlData, translations) {
  return new Promise((resolve, reject) => {
    const parser = new xml2js.Builder();
    xml2js.parseString(xmlData, (err, result) => {
      if (err) {
        reject(err);
      } else {
        let index = 0; // Index for translations array
        result.resource.property.forEach(property => {
          property.value.forEach(value => {
			//console.log(value);
            if (value.$[langAttribute] === 'en') { // Update non-English values
                console.log(value);
                property.value.push({
					  _: translations[index++],
					  $: {
						[langAttribute]: 'bg' // Change attribute name if different
					  }
					});
              property.value.forEach(valueElementA => {
						console.log(valueElementA);
			  });
            }
          });
        });

        const updatedXml = parser.buildObject(result);
        resolve(updatedXml);
      }
    });
  });
}

// Main function to read XML, translate, and write updated XML
async function main() {
  try {
    const fs = require('fs'); // File system module
    const process = require('process'); // To access command line arguments

    // Check for required arguments (input and output filenames)
    if (process.argv.length !== 4) {
      console.error('Usage: node translate_xml.js <input_file.xml> <output_file.xml>');
      return;
    }

    const inputFile = process.argv[2];
    const outputFile = process.argv[3];

    // Read XML file content
    const xmlData = fs.readFileSync(inputFile, 'utf-8');

    // Extract text for translation
    const textToTranslate = await parseXml(xmlData);

    const translations = await Promise.all(textToTranslate.map(translateText));
    
    //console.log('Translations: '+translations);

    // Update XML with translated text
    const updatedXml = await updateXml(xmlData, translations);

    // Write updated XML to the specified output file
    fs.writeFileSync(outputFile, updatedXml, 'utf-8');
    console.log('XML translation complete!');
  } catch (error) {
    console.error('Error during translation process:', error);
  }
}

main();
