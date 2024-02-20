//  Read README before run

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { MongoClient } = require('mongodb');
const { readFile } = require('node:fs/promises');
const mongodbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scidap';



//function to make all the NOT USE tag under one id
function ServiceTag(arr, arrTags) {
    const NotUseTag = 'jHhgZEda7i2CkMdu9';
    arr.forEach((doc) => {

        if (typeof doc.servicetags != 'undefined') {
            //get rid of null in servicetags
            doc.servicetags = doc.servicetags.filter(tag => tag != null);

            //check for service tags
            doc.servicetags.forEach((tag, i) => {
                const tagName = arrTags.find(obj => {
                    return obj._id === tag;
                });

                if (tagName.name === 'Not In Use') {
                    //change the not in use tag with one we choose ahead of time
                    doc.servicetags[i] = NotUseTag;

                }

            })
        }
    });
    return arr;
}

//function that creates new object from cwl file and checking the fields
function Create_CWL_Object(i) {
    let ID = i._id;
    let date = null;
    let source = null;
    let serviceTags = [];
    let tags = null;
    let toolList = null;
    let input = null;
    let output = null;
    let meta = null;
    let metadata = null;
    let desc = null;
    let upstream = [];
    let git = null;
    let versionControl = null;
    let packed = null;

    //check if fields exists
    if (typeof i.date != 'undefined') {
        date = i.date;
    }
    if (typeof i.servicetags != 'undefined') {
        serviceTags = i.servicetags;
    }
    if (typeof i.source != 'undefined') {
        source = i.source;
    }
    if (typeof i.tags != 'undefined') {
        tags = i.tags;
    }
    if (typeof i.toolList != 'undefined') {
        toolList = i.toolList;
    }
    if (typeof i.source.json.inputs != 'undefined') {
        input = i.source.json.inputs;
    }
    if (typeof i.source.json.outputs != 'undefined') {
        output = i.source.json.outputs;
    }
    if (typeof i.source.json.metadata != 'undefined') {
        meta = i.source.json.metadata;
    }
    if (typeof i.description != 'undefined') {
        desc = i.description;
    }
    if (typeof i.metadata != 'undefined') {
        metadata = i.metadata;
    }
    if (typeof i.upstream != 'undefined') {
        i.upstream._ides.forEach((id) => {
            upstream.push(id);
        });

    }
    if (typeof i.git != 'undefined') {
        git = i.git;
    }
    if (typeof i.versionControl != 'undefined') {
        versionControl = i.versionControl;
    }
    if (typeof i.source.packed != 'undefined') {
        packed = i.source.packed;
    }
    const CWL = {
        ID: ID,
        servicetags: serviceTags,
        tags: tags,
        date: date,
        description: desc,
        git: git,
        metadata: meta,
        metadata1: metadata,

        upstream: upstream,
        source: source,
        toolList: toolList,
        versionControl: versionControl
    }
    return CWL;
}

//function to create the CWL_SYNC collection and push data
function PushCWL_SYNC(arr, batch, database) {
    arr.forEach((cwl) => {
        const sample = Create_CWL_Object(cwl);

        let docRef = database.collection('CWL_SYNC').doc(sample.ID);
        batch.set(docRef, {

            git: sample.git,
            packed: sample.source.packed,
            versionControl: sample.versionControl

        })
    });
}

//function to create CWL_UI collection and push data
function PushCWL_UI_Firebase(arr, batch, database) {
    arr.forEach((cwl) => {
        const sample = Create_CWL_Object(cwl);

        let docRef = database.collection('CWL_UI').doc(sample.ID);
        batch.set(docRef, {
            inputs: sample.source.json.inputs,
            outputs: sample.source.json.outputs,
            metadata: sample.source.json.metadata,
            description: sample.description,
            upstreams: sample.upstream,
            tags: sample.tags,
            servicetags: sample.servicetags

        })

    });
}

async function main() {
    //TODO: check if file key exists
    // If env var is set
    if (process.env.FIREBASE_KEY_PATH) {
        const { default: serviceAccount } = await import(
            process.env.FIREBASE_KEY_PATH,
            {
                assert: { type: "json" },
            }
        );
        initializeApp({
            credential: cert(serviceAccount)
        });
    }
    else {
        // Initialize Firebase
        initializeApp({
            projectId: "scidap-development"
        });
    }
    const client = new MongoClient(mongodbURI);
    await client.connect();
    const db = client.db();
    const arrTags = await db
        .collection('service_tags')
        .find()
        .toArray();
    const arrProjects = await db
        .collection('CWL')
        .find({'git.remote': 'https://github.com/datirium/workflows'})
        //.limit(25)
        .toArray();

        console.log(arrProjects.length);
    //create an array of batches to push one by one
    const batches = [];
    for (let i = 0; i < arrProjects.length; i = i + 80) {

        if (i + 80 > arrProjects.length) {
            batches.push(arrProjects.slice(i));
        }
        else {
            batches.push(arrProjects.slice(i, i + 80));
        }
    }
    //crerate CWL_UI array from array of CWL files 
    let arrCWL_UI = arrProjects.filter((doc) => {
        if (typeof doc.versionControl != 'undefined') {
            if (typeof doc.versionControl.next == 'undefined') {
                if (typeof doc.description.label != 'undefined') {
                    if (!doc.description.label.startsWith('DEPRECATED')) {
                        return true;
                    }
                }
                else {
                    return true;
                }
            }
        }
        else {
            return false;
        }
    });
    const database = getFirestore();
    let batch = database.batch();
    //changing all the service tags in cwl_ui to the right one
    arrCWL_UI = ServiceTag(arrCWL_UI, arrTags);
    console.log(arrCWL_UI.length);
    //creating a batch to write to firestore
    PushCWL_UI_Firebase(arrCWL_UI, batch, database);

    //writing the batch to firestore
    await batch.commit().then(() => {
        batch = database.batch();
    });
    
    //write each batch to the firestore
    for (batch1 of batches) {
        PushCWL_SYNC(batch1, batch, database);
        await batch.commit().then(() => {
            batch = database.batch();
        });
    }

    await client.close();
    return Promise.resolve();
}

main().then(() => {
    console.log('finish');
})








