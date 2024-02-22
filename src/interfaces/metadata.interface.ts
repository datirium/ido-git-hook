export const metadata = [
    {
        advanced_header: {
            cwlVersion: 'v1.0',
            class: 'Workflow',

            inputs: {

                alias: {
                    type: 'string',
                    label: "Experiment short name/Alias",
                    'sd:preview': {
                        position: 1
                    }
                }
            },
            outputs: [],
            steps: []
        }
    },
    {
        chipseq_header: {
            cwlVersion: 'v1.0',
            class: 'Workflow',

            inputs: {

                alias: {
                    type: 'string',
                    label: "Experiment short name/Alias",
                    'sd:preview': {
                        position: 1
                    }
                },
                cells: {
                    type: 'string',
                    label: "Cells",
                    'sd:preview': {
                        position: 2
                    }
                },
                conditions: {
                    type: 'string',
                    label: "Conditions",
                    'sd:preview': {
                        position: 3
                    }
                },
                catalog: {
                    type: 'string?',
                    label: "Catalog #"
                }
            },
            outputs: [],
            steps: []
        }
    },
    {
        indices_header: {
            cwlVersion: 'v1.0',
            class: 'Workflow',

            inputs: {

                genome_label: {
                    type: 'string',
                    label: "Genome label",
                    'sd:preview': {
                        position: 1
                    }
                },
                genome_description: {
                    type: 'string',
                    label: "Genome description",
                    'sd:preview': {
                        position: 2
                    }
                },
                genome_details: {
                    type: 'string',
                    label: "Genome details",
                    'sd:preview': {
                        position: 3
                    }
                }
            },
            outputs: [],
            steps: []
        }
    },
    {
        rnaseq_header: {
            cwlVersion: 'v1.0',
            class: 'Workflow',

            inputs: {

                alias: {
                    type: 'string',
                    label: "Experiment short name/Alias",
                    'sd:preview': {
                        position: 1
                    }
                },
                cells: {
                    type: 'string',
                    label: "Cells",
                    'sd:preview': {
                        position: 2
                    }
                },
                conditions: {
                    type: 'string',
                    label: "Conditions",
                    'sd:preview': {
                        position: 3
                    }
                }
            },
            outputs: [],
            steps: []
        }
    }
]