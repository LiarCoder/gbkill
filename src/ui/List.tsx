import React, { useState } from 'react';
import { Box, Text } from 'ink';
import userInput, { IRange } from './userInput.js'
import { BRANCH_STATUS, BRANCH_STATUS_TEXT } from '../constants.js';
import task from '../task.js';
import Spinner from 'ink-spinner';
import { BranchSingleDeleteSuccess } from 'simple-git';

export enum Actions {
    SPACE = 'space',
    TAB = 'tab',
}
interface IList {
    branches: Array<any>;
    onEventTrigger: (taskId: string, branchName: string) => void;
}

const List: React.FC<IList> = (props) => {

    const [branches, setBranches] = useState(props.branches);

    // *********************
    // Default Function
    // *********************

    const deleteBranch = (range: IRange, action: Actions) => {
        // 并发执行
        // TODO: 写一个深度方法copy一下
        const cloneBranches = JSON.parse(JSON.stringify(branches))
        for (let i = range.start; i <= range.end; i++) {
            const branch = cloneBranches[i];
            const merged = action === Actions.TAB ? true : branch.merged;
            const canDelete = ![BRANCH_STATUS.DELETED, BRANCH_STATUS.DELETING].includes(branch.status)
            if (merged && canDelete) {
                // 分支被合并了，以及状态不是'正在删除'|'删除成功'
                cloneBranches[i].status = BRANCH_STATUS.DELETING;
                task.createTask<BranchSingleDeleteSuccess>((taskId) => {
                    props.onEventTrigger(taskId, branch.name)
                }).then(res => {
                    const copyBranches = JSON.parse(JSON.stringify(branches))
                    if (res.success) {
                        copyBranches[i].status = BRANCH_STATUS.DELETED;
                    } else {
                        copyBranches[i].status = BRANCH_STATUS.FAILED;
                    }
                    setBranches(copyBranches)
                })
            } else if (!merged && canDelete) {
                cloneBranches[i].status = BRANCH_STATUS.NO_MERGED;
            }
        }
        setBranches(cloneBranches)
    }

    // 空格触发事件
    const onSpace = (range: IRange) => {
        deleteBranch(range, Actions.SPACE);
    }

    // tan触发事件
    const onTab = (range: IRange) => {
        deleteBranch(range, Actions.TAB);
    }

    // *********************
    // Hooks Function
    // *********************

    const { range } = userInput(branches.length, { onSpace, onTab })

    // *********************
    // Life Cycle Function
    // *********************

    // *********************
    // Service Function
    // *********************

    const highlight = (index: number) => {
        if (index >= range.start && index <= range.end) {
            return {
                color: 'blue'
            }
        } else {
            return {
                color: 'gray'
            }
        }
    }

    const statusColor = (status: BRANCH_STATUS) => {
        switch (status) {
            case BRANCH_STATUS.NO_MERGED:
                return '#FD999A'
            case BRANCH_STATUS.DELETED:
                return 'green'
            case BRANCH_STATUS.FAILED:
                return 'red'
            default:
                return ''
        }
    }

    // *********************
    // View
    // *********************

    const renderStatus = (item: any) => {
        if (item.status === BRANCH_STATUS.NONE) {
            return null;
        } else if (item.status === BRANCH_STATUS.DELETING) {
            return (
                <Text>
                    <Spinner type="earth" />
                </Text>
            )
        }
        return (
            <Text color={statusColor(item.status)}>
                {`[${BRANCH_STATUS_TEXT[item.status as BRANCH_STATUS]}] `}
            </Text>
        )
    }

    // TODO 整行背景高亮，暂时不支持等其支持在处理
    //  https://github.com/vadimdemedes/ink/issues/598

    return (
        <Box flexDirection="column" >
            {
                branches.map((item, index) => {
                    return (
                        <Box key={item.name}>
                            <Box width='30%'>
                                <Text wrap="truncate-end" {...highlight(index)} >
                                    {renderStatus(item)}{item.name}
                                </Text>
                            </Box>
                            <Box flexGrow={1}>
                                <Text wrap="truncate-end" {...highlight(index)} >{item.value}</Text>
                            </Box>
                            <Text {...highlight(index)} >{item.merged ? 'yes' : 'No'}</Text>
                        </Box>
                    )
                })
            }
        </Box>
    )
};

export default List
