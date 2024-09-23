import {
    Accordion,
    AccordionGroup,
    AccordionSummary,
    accordionSummaryClasses, Box, Button, ButtonGroup, CircularProgress,
    DialogContent, DialogTitle,
    Modal,
    ModalDialog,
    Typography
} from "@mui/joy";
import {useEffect, useState} from "react";
import {BulkNode} from "../interfaces.ts";
import {callBackend} from "../Utils.ts";
import {PAD, SMALL_PART} from "../constants.ts";
import AddIcon from "@mui/icons-material/Add";
import toast from "react-hot-toast";

export default function RemoteSelectModal({
    open,
    setOpen,
    onSelect
} : {
    open: boolean,
    setOpen: (open: boolean) => void,
    onSelect: (node: BulkNode) => void
}) {
    const [parentNodes, setParentNodes] = useState<BulkNode[]>([]);
    const [nodes, setNodes] = useState<BulkNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectNode, setSelectNode] = useState<BulkNode | undefined>(undefined);

    function loadRoot() {
        setLoading(true);
        callBackend("list", {
            p: "/"
        }).then((res) => {
            setNodes(res.data.Nodes);
            setParentNodes([]);
            setLoading(false);
        }).catch(() => {
            setOpen(false);
            toast.error("Failed to load list.");
            setLoading(false);
        });
    }

    // 获取根目录
    useEffect(() => {
        if (parentNodes.length === 0 && open && nodes.length === 0) {
            loadRoot();
        }
    }, [open, setOpen]);

    function handleSelect(node: BulkNode) {
        setSelectNode(node);
        // onSelect(node);
    }

    function handleConfirm() {
        if (selectNode) {
            onSelect(selectNode);
        }
        setOpen(false);
    }

    function handleCancel() {
        setOpen(false);
    }

    function handleEnter(node: BulkNode) {
        setLoading(true);
        callBackend("list", {
            p: node.Path
        }).then((res) => {
            setParentNodes([...parentNodes, node]);
            setNodes(res.data.Nodes);
            setLoading(false);
        }).catch(() => {
            toast.error("Failed to load list.");
            setLoading(false);
        });
    }

    function handleBackParent() {
        setLoading(true);
        // remove current dir
        parentNodes.pop();
        let dirParent = parentNodes.pop();
        if (dirParent) {
            handleEnter(dirParent);
        } else {
            loadRoot();
        }
    }

    return (
        <Modal
            open={open}
            onClose={() => setOpen(false)}
        >
            <ModalDialog sx={{width: `${SMALL_PART}%`}}>
                <DialogContent sx={{gap: 2}}>
                    <DialogTitle>
                        <Box sx={{
                            width: '100%', pl: PAD, pr: PAD,
                            display: "flex", flexDirection: 'row', alignItems: "center", justifyContent: "space-between"
                        }}>
                            {
                                loading ? "Loading" :
                                parentNodes.length === 0
                                ? "Root" : getName(parentNodes[parentNodes.length-1])
                            }
                            <Button
                                variant="outlined"
                                size="sm"
                                color="neutral"
                                disabled={loading || parentNodes.length === 0}
                                onClick={() => handleBackParent()}
                            >
                                Back
                            </Button>
                        </Box>
                    </DialogTitle>
                    <Box sx={{
                        width: '100%',
                        display: 'flex', flexDirection: 'row', alignItems: "center", justifyContent: "center"
                    }}>
                        {
                            loading ? <CircularProgress size="sm"/> : <></>
                        }
                    </Box>
                    <AccordionGroup
                        sx={{
                            maxWidth: "100%",
                            [`& .${accordionSummaryClasses.indicator}`]: {
                                transition: '0.2s',
                            },
                            [`& [aria-expanded="true"] .${accordionSummaryClasses.indicator}`]: {
                                transform: 'rotate(45deg)',
                            },
                        }}
                    >
                        {nodes.map((node) =>
                            node.Type === "COLLECTION" ? (
                                <Accordion
                                    key={node.Uuid}
                                    expanded={selectNode?.Uuid === node.Uuid}
                                    disabled={loading}
                                >
                                    <AccordionSummary
                                        onClick={() => handleSelect(node)}
                                        onDoubleClick={() => handleEnter(node)}
                                        indicator={<AddIcon/>}
                                    >
                                        {getName(node)}
                                    </AccordionSummary>
                                </Accordion>
                            ) : <></>
                        )}
                    </AccordionGroup>
                    <ButtonGroup
                        variant="soft"
                        aria-label="outlined primary button group"
                        buttonFlex={`0 1 100%`}
                        sx={{ width: '100%', justifyContent: 'center' }}
                    >
                        <Button onClick={() => handleCancel()}>
                            Cancel
                        </Button>
                        <Button color="primary" onClick={() => handleConfirm()}>
                            Confirm
                        </Button>
                    </ButtonGroup>
                    <Typography level="body-sm" sx={{width: '100%', textAlign: 'center'}}>
                        Click to select. Double click to see children.
                    </Typography>
                </DialogContent>
            </ModalDialog>
        </Modal>
    );
}

export function getName(node: BulkNode): string {
    let n = node.MetaStore.name || node.MetaStore.ws_label;
    if (n.endsWith('"')) {
        n = n.substring(0, n.length - 1);
    }
    if (n.startsWith('"')) {
        n = n.substring(1, n.length);
    }
    return n;
}
