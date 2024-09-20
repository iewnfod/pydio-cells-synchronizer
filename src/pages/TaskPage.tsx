import {Box, Button, ButtonGroup, Chip, IconButton, Sheet, Table, Typography} from "@mui/joy";
import {DEFAULT_USER_DATA, Task, UserData} from "../interfaces.ts";
import {useEffect, useState} from "react";
import {getValueFromStorage, PAD, TASKS_STORAGE_KEY} from "../constants.ts";
import LogoutIcon from '@mui/icons-material/Logout';
import EditIcon from '@mui/icons-material/Edit';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import AddIcon from '@mui/icons-material/Add';
import CreateTaskModal from "../modals/CreateTaskModal.tsx";
import {getName} from "../modals/RemoteSelectModal.tsx";
import DeleteIcon from '@mui/icons-material/Delete';
import {loadTime} from "../Utils.ts";

export default function TaskPage({
    userData,
    setUserData,
    setPat
} : {
    userData: UserData;
    setUserData: (userData: UserData) => void;
    setPat: (pat: string) => void;
}) {
    const [tasks, _setTasks] = useState<Task[]>(
        JSON.parse(getValueFromStorage(TASKS_STORAGE_KEY, "[]"))
    );

    const [taskModalOpen, setTaskModalOpen] = useState(false);

    useEffect(() => {
        if (userData.Uuid.length === 0) {
            window.location.href = '/';
        }
    }, [userData, setUserData]);

    function setTasks(newTasks: Task[]) {
        localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(newTasks));
        _setTasks(newTasks);
    }

    function handleNewTask() {
        setTaskModalOpen(true);
    }

    function createTask(newTask: Task) {
        setTasks([...tasks, newTask])
    }

    function handleLogout() {
        setUserData(DEFAULT_USER_DATA);
        setPat("");
    }

    function handlePlay() {

    }

    function handlePause() {

    }

    function handleEdit() {

    }

    function handleDelete(task: Task) {
        let newTasks = JSON.parse(JSON.stringify(tasks));
        if (tasks.indexOf(task) !== -1) {
            newTasks.splice(tasks.indexOf(task), 1);
        }
        setTasks(newTasks);
    }

    return (
        <Box sx={{height: '90vh', display: 'flex', flexDirection: 'column', gap: PAD}}>
            <Box sx={{
                pl: PAD, pr: PAD, pb: PAD,
                display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <Typography level="title-lg">
                    Tasks
                </Typography>
                <ButtonGroup>
                    <Button
                        onClick={() => handleNewTask()}
                        startDecorator={<AddIcon/>}
                    >
                        New Task
                    </Button>
                    <IconButton onClick={() => handleLogout()}>
                        <LogoutIcon/>
                    </IconButton>
                </ButtonGroup>
            </Box>
            <Sheet>
                <Table stickyHeader sx={{
                    pl: PAD, pr: PAD, pb: PAD,
                    '& tr > :last-child': { textAlign: 'right' }
                }}>
                    <thead>
                    <tr>
                        <th>Local Dir</th>
                        <th>Remote Dir</th>
                        <th>Ignored</th>
                        <th style={{width: '15%'}}>Repeat Interval</th>
                        <th style={{width: '10%'}}>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {tasks.map((task: Task) => (
                        <tr key={task.uuid}>
                            <td>{task.localDir}</td>
                            <td>
                                <Box sx={{
                                    display: 'flex', flexFlow: 'row wrap', justifyContent: 'flex-start', alignItems: 'center',
                                    gap: PAD/2, flexDirection: 'row'
                                }}>
                                    <Typography>
                                        {getName(task.remoteDir)}
                                    </Typography>
                                    <Typography>
                                        ({task.remoteDir.Path})
                                    </Typography>
                                </Box>
                            </td>
                            <td>
                                <Box sx={{
                                    display: 'flex', flexFlow: 'row wrap', justifyContent: 'flex-start', alignItems: 'center',
                                    gap: PAD/2, flexDirection: 'row'
                                }}>
                                    {
                                        task.ignores.map((ignore, index) => (
                                            <Chip key={index}>{ignore}</Chip>
                                        ))
                                    }
                                </Box>
                            </td>
                            <td>
                                {loadTime(task.repeatInterval)}
                            </td>
                            <td>
                                <Box sx={{display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center'}}>
                                    <ButtonGroup
                                        aria-label="outlined primary button group"
                                        size="sm"
                                    >
                                        {
                                            task.paused ? (
                                                <IconButton onClick={() => handlePlay()}>
                                                    <PlayCircleIcon/>
                                                </IconButton>
                                            ) : (
                                                <IconButton onClick={() => handlePause()}>
                                                    <PauseCircleIcon/>
                                                </IconButton>
                                            )
                                        }
                                        <IconButton onClick={() => handleEdit()}>
                                            <EditIcon/>
                                        </IconButton>
                                        <IconButton onClick={() => handleDelete(task)}>
                                            <DeleteIcon/>
                                        </IconButton>
                                    </ButtonGroup>
                                </Box>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            </Sheet>
            <Box sx={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
            }}>
                {
                    tasks.length === 0 ?
                        <Typography level="title-lg">
                            Try to add a new sync task!
                        </Typography>
                        : <></>
                }
            </Box>
            <CreateTaskModal
                open={taskModalOpen}
                setOpen={setTaskModalOpen}
                createTask={createTask}
            />
        </Box>
    );
}
