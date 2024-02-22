import { Injectable, Inject } from '@nestjs/common';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import * as admin from 'firebase-admin';
import { Cwl } from 'src/interfaces';

@Injectable()
export class FireconectionService {
    private readonly db: FirebaseFirestore.Firestore;
    constructor() {
        if (admin.apps.length === 0) {
            initializeApp({
                projectId: "scidap-development",
            });
        }
        this.db = admin.firestore();
    }

    public async setCollection(cwls: Cwl[]) {
        const batch = this.db.batch()
        for (const cwl of cwls) {
            //getting all documents with the same url as the new workflows
            let collectionRef;
            if(cwl?.description?.url){
            collectionRef = await this.db.collection('CWL_STAGED').where('description.url', '==', cwl.description.url).get();
            }
            else{
                console.log('doesnt habe desc')
            }
            //checking if the document already exists: if they doesn't create new document if they does update the same document
            if (!!collectionRef) {
                let docRef = this.db.collection('CWL_STAGED').doc();
                //create new document
                batch.set(docRef, {
                    description: cwl.description,
                    git: cwl.git,
                    inputs: cwl.inputs,
                    outputs: cwl.outputs,
                    metadata: cwl.metadata,
                    packed: cwl.packed,
                    upstreams: cwl.upstreams,
                    servicetags: cwl.servicetags
                })
            }
            else {
                collectionRef.forEach(doc=>{
                    let docRef = this.db.collection('CWL_STAGED').doc(doc.id);
                    //update the existing document
                    batch.update(docRef, {
                        description: cwl.description,
                        git: cwl.git,
                        inputs: cwl.inputs,
                        outputs: cwl.outputs,
                        metadata: cwl.metadata,
                        packed: cwl.packed,
                        upstreams: cwl.upstreams,
                        servicetags: cwl.servicetags
                    })
                })
            }
        }
        await batch.commit();
    }
    /**
     * 
     * @param CWL_url workflow url
     * @returns object where id is the key and data of workflow is the value: supposed to be one key in the object because one document for each cwl
     */
    public async FindWorkflowByURL(CWL_url: string) {
        const cwl_id  = {}
        const CWLref = this.db.collection('CWL_UI');
        const ID = await CWLref.where('description.url', '==', CWL_url).get();
        if (ID.empty) {
            console.log('empty');
            return cwl_id;
        }
        else {
            ID.forEach(doc => {
                cwl_id[doc.id] = doc.data();
            })
            if(Object.keys(cwl_id).length>1){
                console.log('multiple workflows with the same url');
            }
            return cwl_id;
        }
    }

    public async Get_servicetagID_byName(serviceName: string){
        const serviceTags = []
        const serviceSnapshot = await this.db.collection('service_tags').where('name', '==', serviceName).get();
        if(serviceSnapshot.empty){
            console.log('tag is not in service tags collection');
            return serviceTags;
        }
        else{
            serviceSnapshot.forEach(doc=> {
                serviceTags.push(doc.id);
            });
            
            return serviceTags;
        }
    }
}
