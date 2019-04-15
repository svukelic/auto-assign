import { Context } from 'probot'
import { handlePullRequest } from '../src/handler'

describe('handlePullRequest', () => {
  let event: any
  let context: Context

  beforeEach(async () => {
    event = {
      id: '123',
      name: 'pull_request',
      payload: {
        action: 'opened',
        number: '1',
        pull_request: {
          number: '1',
          title: 'test',
          user: {
            login: 'pr-creator'
          }
        },
        repository: {
          name: 'auto-assign',
          owner: {
            login: 'kentaro-m'
          }
        }
      }
    }

    context = new Context(event, {} as any, {} as any)

    context.config = jest.fn().mockImplementation(async () => {
      return {
        addAssignees: true,
        addReviewers: true,
        numberOfReviewers: 0,
        reviewers: ['reviewer1', 'reviewer2', 'reviewer3'],
        skipKeywords: ['wip']
      }
    })

    context.log = jest.fn() as any
  })

  test('responds with the error if the configuration file failed to load', async () => {
    try {
      // tslint:disable-next-line:no-empty
      context.config = jest.fn().mockImplementation(async () => {})
      await handlePullRequest(context)
    } catch (error) {
      expect(error).toEqual(new Error('the configuration file failed to load'))
    }
  })

  test('exits the process if pull requests include skip words in the title', async () => {
    const spy = jest.spyOn(context, 'log')

    event.payload.pull_request.title = 'wip test'
    await handlePullRequest(context)

    expect(spy.mock.calls[0][0]).toEqual('skips adding reviewers')
  })

  test('adds reviewers to pull requests if the configuration is enabled, but no assignees', async () => {
    context.config = jest.fn().mockImplementation(async () => {
      return {
        addAssignees: false,
        addReviewers: true,
        numberOfReviewers: 0,
        reviewers: ['reviewer1', 'reviewer2', 'reviewer3', 'pr-creator'],
        skipKeywords: ['wip']
      }
    })

    context.github.issues = {
      // tslint:disable-next-line:no-empty
      addAssignees: jest.fn().mockImplementation(async () => {})
    } as any

    context.github.pullRequests = {
      // tslint:disable-next-line:no-empty
      createReviewRequest: jest.fn().mockImplementation(async () => {})
    } as any

    const addAssigneesSpy = jest.spyOn(context.github.issues, 'addAssignees')
    const createReviewRequestSpy = jest.spyOn(
      context.github.pullRequests,
      'createReviewRequest'
    )

    await handlePullRequest(context)

    expect(addAssigneesSpy).not.toBeCalled()
    expect(createReviewRequestSpy.mock.calls[0][0].reviewers).toHaveLength(3)
    expect(createReviewRequestSpy.mock.calls[0][0].reviewers[0]).toMatch(
      /reviewer/
    )
  })

  test('adds reviewers to assignees to pull requests if the configuration is enabled ', async () => {
    context.config = jest.fn().mockImplementation(async () => {
      return {
        addAssignees: true,
        addReviewers: false,
        numberOfReviewers: 0,
        reviewers: ['reviewer1', 'reviewer2', 'reviewer3', 'pr-creator'],
        skipKeywords: ['wip']
      }
    })

    context.github.issues = {
      // tslint:disable-next-line:no-empty
      addAssignees: jest.fn().mockImplementation(async () => {})
    } as any

    context.github.pullRequests = {
      // tslint:disable-next-line:no-empty
      createReviewRequest: jest.fn().mockImplementation(async () => {})
    } as any

    const addAssigneesSpy = jest.spyOn(context.github.issues, 'addAssignees')
    const createReviewRequestSpy = jest.spyOn(
      context.github.pullRequests,
      'createReviewRequest'
    )

    await handlePullRequest(context)

    expect(addAssigneesSpy.mock.calls[0][0].assignees).toHaveLength(3)
    expect(addAssigneesSpy.mock.calls[0][0].assignees[0]).toMatch(/reviewer/)
    expect(addAssigneesSpy.mock.calls[0][0].assignees).toEqual(expect.arrayContaining([
      'reviewer1', 'reviewer2', 'reviewer3'
    ]))
    expect(createReviewRequestSpy).not.toBeCalled()
  })

  test('adds assignees to pull requests if the assigness are enabled explicitly', async () => {
    context.config = jest.fn().mockImplementation(async () => {
      return {
        addAssignees: true,
        addReviewers: false,
        assignees: ['assignee1', 'pr-creator'],
        numberOfAssignees: 2,
        numberOfReviewers: 0,
        reviewers: ['reviewer1', 'reviewer2', 'reviewer3'],
        skipKeywords: ['wip']
      }
    })

    context.github.issues = {
      // tslint:disable-next-line:no-empty
      addAssignees: jest.fn().mockImplementation(async () => {})
    } as any

    context.github.pullRequests = {
      // tslint:disable-next-line:no-empty
      createReviewRequest: jest.fn().mockImplementation(async () => {})
    } as any

    const addAssigneesSpy = jest.spyOn(context.github.issues, 'addAssignees')
    const createReviewRequestSpy = jest.spyOn(
      context.github.pullRequests,
      'createReviewRequest'
    )

    await handlePullRequest(context)

    expect(addAssigneesSpy.mock.calls[0][0].assignees).toHaveLength(1)
    expect(addAssigneesSpy.mock.calls[0][0].assignees).toEqual(expect.arrayContaining(['assignee1']))
    expect(createReviewRequestSpy).not.toBeCalled()
  })

  test('adds assignees to pull requests using the numberOfReviewers when numberOfAssignees is unspecified', async () => {
    context.config = jest.fn().mockImplementation(async () => {
      return {
        addAssignees: true,
        addReviewers: true,
        assignees: ['assignee1', 'assignee2', 'assignee3'],
        numberOfReviewers: 2,
        reviewers: ['reviewer1', 'reviewer2', 'reviewer3'],
        skipKeywords: ['wip']
      }
    })

    context.github.issues = {
      // tslint:disable-next-line:no-empty
      addAssignees: jest.fn().mockImplementation(async () => {})
    } as any

    context.github.pullRequests = {
      // tslint:disable-next-line:no-empty
      createReviewRequest: jest.fn().mockImplementation(async () => {})
    } as any

    const addAssigneesSpy = jest.spyOn(context.github.issues, 'addAssignees')
    const createReviewRequestSpy = jest.spyOn(
      context.github.pullRequests,
      'createReviewRequest'
    )

    await handlePullRequest(context)

    expect(addAssigneesSpy.mock.calls[0][0].assignees).toHaveLength(2)
    expect(addAssigneesSpy.mock.calls[0][0].assignees[0]).toMatch(/assignee/)
    expect(createReviewRequestSpy.mock.calls[0][0].reviewers).toHaveLength(2)
    expect(createReviewRequestSpy.mock.calls[0][0].reviewers[0]).toMatch(
      /reviewer/
    )
  })

  test("doesn't add assignees if the reviewers contain only a pr creator and assignees are not explicit", async () => {
    context.config = jest.fn().mockImplementation(async () => {
      return {
        addAssignees: true,
        addReviewers: true,
        numberOfReviewers: 0,
        reviewers: ['pr-creator'],
        skipKeywords: ['wip']
      }
    })

    context.github.issues = {
      // tslint:disable-next-line:no-empty
      addAssignees: jest.fn().mockImplementation(async () => {})
    } as any

    context.github.pullRequests = {
      // tslint:disable-next-line:no-empty
      createReviewRequest: jest.fn().mockImplementation(async () => {})
    } as any

    const addAssigneesSpy = jest.spyOn(context.github.issues, 'addAssignees')
    const createReviewRequestSpy = jest.spyOn(
      context.github.pullRequests,
      'createReviewRequest'
    )

    await handlePullRequest(context)

    expect(addAssigneesSpy).not.toHaveBeenCalled()
    expect(createReviewRequestSpy).not.toHaveBeenCalled()
  })

  test('adds assignees to pull requests if throws error to add reviewers', async () => {
    context.config = jest.fn().mockImplementation(async () => {
      return {
        addAssignees: true,
        addReviewers: true,
        assignees: ['maintainerX', 'maintainerY'],
        numberOfReviewers: 0,
        reviewers: ['reviewerA', 'reviewerB'],
        skipKeywords: ['wip']
      }
    })

    context.github.issues = {
      // tslint:disable-next-line:no-empty
      addAssignees: jest.fn().mockImplementation(async () => {})
    } as any

    context.github.pullRequests = {
      createReviewRequest: jest.fn().mockImplementation(async () => {
        throw new Error('Review cannot be requested from pull request author.')
      })
    } as any

    const spy = jest.spyOn(context.github.issues, 'addAssignees')

    await handlePullRequest(context)

    expect(spy.mock.calls[0][0].assignees).toHaveLength(2)
    expect(spy.mock.calls[0][0].assignees[0]).toMatch(/maintainer/)
  })

  test('adds reviewers to pull requests if throws error to add assignees', async () => {
    context.config = jest.fn().mockImplementation(async () => {
      return {
        addAssignees: true,
        addReviewers: true,
        assignees: ['maintainerX', 'maintainerY'],
        numberOfReviewers: 0,
        reviewers: ['reviewerA', 'reviewerB'],
        skipKeywords: ['wip']
      }
    })

    context.github.issues = {
      addAssignees: jest.fn().mockImplementation(async () => {
        throw new Error('failed to add assignees.')
      })
    } as any

    context.github.pullRequests = {
      // tslint:disable-next-line:no-empty
      createReviewRequest: jest.fn().mockImplementation(async () => {})
    } as any

    const spy = jest.spyOn(context.github.pullRequests, 'createReviewRequest')

    await handlePullRequest(context)

    expect(spy.mock.calls[0][0].reviewers).toHaveLength(2)
    expect(spy.mock.calls[0][0].reviewers[0]).toMatch(/reviewer/)
  })

  /*
   * If 'useReviewGroups' == true, then use the 'groups' object to select reviewers and assignees.
   * The new functionality will still decide to add reviewers and assignees based on the 'addReviewers'
   * and 'addAssignees' flags.
   *
   * Use Cases for group reviews:
   * - if the groups are not present or an empty list, then use normal reviewer functionality
   * - if 'addReviewers' == true
   *   - if #reviewers is 0, follow default behavior (add all users to review)
   *   - if #reviewers is > 0, select #reviewers randomly (exclude self) from each group
   *     + if #peopleInGroup is < #reviewers, select all people in that group to review
   *
   * - if 'addAssignees' == true
   *   - var assignees = #reviewers || #assignees
   *   - if assignees is 0, follow default behavior (add all users to review)
   *   - if assignees is > 0, select assignees randomly (exclude self) from each group
   *     - if #peopleInGroup is < assignees, select all people in that group to be assignees
   */
  test('responds with the error if review groups are enabled, but no reviewGroups variable is defined in configuration', async () => {
    try {
        // GIVEN
      context.config = jest.fn().mockImplementation(async () => {
        return {
          useReviewGroups: true
        }
      })

        // WHEN
      await handlePullRequest(context)

    } catch (error) {
        // THEN
      expect(error).toEqual(new Error('Error in configuration file to do with using review groups. Expected \'reviewGroups\' variable to be set because the variable \'useReviewGroups\' = true.'))
    }
  })

  test('responds with the error if assignee groups are enabled, but no assigneeGroups variable is defined in configuration', async () => {
    try {
        // GIVEN
      context.config = jest.fn().mockImplementation(async () => {
        return {
          useAssigneeGroups: true
        }
      })

        // WHEN
      await handlePullRequest(context)

    } catch (error) {
        // THEN
      expect(error).toEqual(new Error('Error in configuration file to do with using review groups. Expected \'assigneeGroups\' variable to be set because the variable \'useAssigneeGroups\' = true.'))
    }
  })

  test('adds reviewers to pull request from reviewers if groups are enabled and empty', async () => {
      // MOCKS
    context.github.pullRequests = {
      createReviewRequest: jest.fn().mockImplementation(async () => {})
    } as any
    const createReviewRequestSpy = jest.spyOn(context.github.pullRequests, 'createReviewRequest')

    context.github.issues = {
      addAssignees: jest.fn().mockImplementation(async () => {})
    } as any
    const addAssigneesSpy = jest.spyOn(context.github.issues, 'addAssignees')

      // GIVEN
    context.config = jest.fn().mockImplementation(async () => {
      return {
        addAssignees: false,
        addReviewers: true,
        useReviewGroups: true,
        numberOfReviewers: 1,
        reviewers: ['reviewer1','reviewer2','reviewer3'],
        reviewGroups: []
      }
    })

      // WHEN
    await handlePullRequest(context)

      // THEN
    expect(createReviewRequestSpy.mock.calls[0][0].reviewers).toHaveLength(1)
    expect(createReviewRequestSpy.mock.calls[0][0].reviewers[0]).toMatch(/reviewer/)
    expect(addAssigneesSpy).not.toBeCalled()
  })

  test('adds reviewers to pull request from two different groups if review groups are enabled', async () => {
    // MOCKS
    context.github.pullRequests = {
      createReviewRequest: jest.fn().mockImplementation(async () => {})
    } as any
    const createReviewRequestSpy = jest.spyOn(context.github.pullRequests, 'createReviewRequest')

    context.github.issues = {
      addAssignees: jest.fn().mockImplementation(async () => {})
    } as any
    const addAssigneesSpy = jest.spyOn(context.github.issues, 'addAssignees')

    // GIVEN
    context.config = jest.fn().mockImplementation(async () => {
      return {
        addAssignees: false,
        addReviewers: true,
        useReviewGroups: true,
        numberOfReviewers: 1,
        reviewGroups: {
          groupA: ['group1-user1','group1-user2','group1-user3'],
          groupB: ['group2-user1', 'group2-user2','group2-user3']
        }
      }
    })

    // WHEN
    await handlePullRequest(context)

    // THEN
    expect(createReviewRequestSpy.mock.calls[0][0].reviewers).toHaveLength(2)
    expect(createReviewRequestSpy.mock.calls[0][0].reviewers[0]).toMatch(/group1/)
    expect(createReviewRequestSpy.mock.calls[0][0].reviewers[1]).toMatch(/group2/)
    expect(addAssigneesSpy).not.toBeCalled()
  })

  test('adds all reviewers from a group that has less members than the number of reviews requested', async () => {
    // MOCKS
    context.github.pullRequests = {
      createReviewRequest: jest.fn().mockImplementation(async () => {})
    } as any
    const createReviewRequestSpy = jest.spyOn(context.github.pullRequests, 'createReviewRequest')

    context.github.issues = {
      addAssignees: jest.fn().mockImplementation(async () => {})
    } as any
    const addAssigneesSpy = jest.spyOn(context.github.issues, 'addAssignees')

    // GIVEN
    context.config = jest.fn().mockImplementation(async () => {
      return {
        addAssignees: false,
        addReviewers: true,
        useReviewGroups: true,
        numberOfReviewers: 2,
        reviewGroups: {
          groupA: ['group1-user1','group1-user2','group1-user3'],
          groupB: ['group2-user1']
        }
      }
    })

    // WHEN
    await handlePullRequest(context)

    // THEN
    expect(createReviewRequestSpy.mock.calls[0][0].reviewers).toHaveLength(3)
    expect(createReviewRequestSpy.mock.calls[0][0].reviewers[0]).toMatch(/group1/)
    expect(createReviewRequestSpy.mock.calls[0][0].reviewers[1]).toMatch(/group1/)
    expect(createReviewRequestSpy.mock.calls[0][0].reviewers[2]).toMatch(/group2-user1/)
    expect(addAssigneesSpy).not.toBeCalled()
  })

  test('adds assignees to pull request from two different groups if groups are enabled and number of assignees is specified', async () => {
    // MOCKS
    context.github.pullRequests = {
      createReviewRequest: jest.fn().mockImplementation(async () => {})
    } as any
    const createReviewRequestSpy = jest.spyOn(context.github.pullRequests, 'createReviewRequest')

    context.github.issues = {
      addAssignees: jest.fn().mockImplementation(async () => {})
    } as any
    const addAssigneesSpy = jest.spyOn(context.github.issues, 'addAssignees')

    // GIVEN
    context.config = jest.fn().mockImplementation(async () => {
      return {
        addAssignees: true,
        addReviewers: false,
        useAssigneeGroups: true,
        numberOfAssignees: 1,
        numberOfReviewers: 2,
        reviewers: ['reviewer1','reviewer2','reviewer3'],
        assigneeGroups: {
          groupA: ['group1-user1','group1-user2','group1-user3'],
          groupB: ['group2-user1'],
          groupC: ['group3-user1','group3-user2','group3-user3']
        }
      }
    })

    // WHEN
    await handlePullRequest(context)

    // THEN
    expect(addAssigneesSpy.mock.calls[0][0].assignees).toHaveLength(3)
    expect(addAssigneesSpy.mock.calls[0][0].assignees[0]).toMatch(/group1/)
    expect(addAssigneesSpy.mock.calls[0][0].assignees[1]).toMatch(/group2/)
    expect(addAssigneesSpy.mock.calls[0][0].assignees[2]).toMatch(/group3/)
    expect(createReviewRequestSpy).not.toBeCalled()
  })

  test('adds assignees to pull request from two different groups and reviewers are not specified', async () => {
    // MOCKS
    context.github.pullRequests = {
      createReviewRequest: jest.fn().mockImplementation(async () => {})
    } as any
    const createReviewRequestSpy = jest.spyOn(context.github.pullRequests, 'createReviewRequest')

    context.github.issues = {
      addAssignees: jest.fn().mockImplementation(async () => {})
    } as any
    const addAssigneesSpy = jest.spyOn(context.github.issues, 'addAssignees')

    // GIVEN
    context.config = jest.fn().mockImplementation(async () => {
      return {
        addAssignees: true,
        addReviewers: false,
        useAssigneeGroups: true,
        numberOfAssignees: 1,
        numberOfReviewers: 2,
        assigneeGroups: {
          groupA: ['group1-user1','group1-user2','group1-user3'],
          groupB: ['group2-user1'],
          groupC: ['group3-user1','group3-user2','group3-user3']
        }
      }
    })

    // WHEN
    await handlePullRequest(context)

    // THEN
    expect(addAssigneesSpy.mock.calls[0][0].assignees).toHaveLength(3)
    expect(addAssigneesSpy.mock.calls[0][0].assignees[0]).toMatch(/group1/)
    expect(addAssigneesSpy.mock.calls[0][0].assignees[1]).toMatch(/group2/)
    expect(addAssigneesSpy.mock.calls[0][0].assignees[2]).toMatch(/group3/)
    expect(createReviewRequestSpy).not.toBeCalled()
  })

  test('adds normal reviewers and assignees from groups into the pull request', async () => {
    // MOCKS
    context.github.pullRequests = {
      createReviewRequest: jest.fn().mockImplementation(async () => {})
    } as any
    const createReviewRequestSpy = jest.spyOn(context.github.pullRequests, 'createReviewRequest')

    context.github.issues = {
      addAssignees: jest.fn().mockImplementation(async () => {})
    } as any
    const addAssigneesSpy = jest.spyOn(context.github.issues, 'addAssignees')

    // GIVEN
    context.config = jest.fn().mockImplementation(async () => {
      return {
        addAssignees: true,
        addReviewers: true,
        useAssigneeGroups: true,
        numberOfAssignees: 1,
        numberOfReviewers: 2,
        reviewers: ['reviewer1', 'reviewer2', 'reviewer3'],
        assigneeGroups: {
          groupA: ['group1-user1','group1-user2','group1-user3'],
          groupB: ['group2-user1'],
          groupC: ['group3-user1','group3-user2','group3-user3']
        }
      }
    })

    // WHEN
    await handlePullRequest(context)

    // THEN
    expect(addAssigneesSpy.mock.calls[0][0].assignees).toHaveLength(3)
    expect(addAssigneesSpy.mock.calls[0][0].assignees[0]).toMatch(/group1/)
    expect(addAssigneesSpy.mock.calls[0][0].assignees[1]).toMatch(/group2/)
    expect(addAssigneesSpy.mock.calls[0][0].assignees[2]).toMatch(/group3/)

    expect(createReviewRequestSpy.mock.calls[0][0].reviewers).toHaveLength(2)
    expect(createReviewRequestSpy.mock.calls[0][0].reviewers[0]).toMatch(/reviewer/)
    expect(createReviewRequestSpy.mock.calls[0][0].reviewers[1]).toMatch(/reviewer/)
  })

  test('adds normal assignees and reviewers from groups into the pull request', async () => {
    // MOCKS
    context.github.pullRequests = {
      createReviewRequest: jest.fn().mockImplementation(async () => {})
    } as any
    const createReviewRequestSpy = jest.spyOn(context.github.pullRequests, 'createReviewRequest')

    context.github.issues = {
      addAssignees: jest.fn().mockImplementation(async () => {})
    } as any
    const addAssigneesSpy = jest.spyOn(context.github.issues, 'addAssignees')

    // GIVEN
    context.config = jest.fn().mockImplementation(async () => {
      return {
        addAssignees: true,
        addReviewers: true,
        useReviewGroups: true,
        numberOfAssignees: 1,
        numberOfReviewers: 2,
        assignees: ['assignee1', 'assignee2', 'assignee3'],
        reviewGroups: {
          groupA: ['group1-reviewer1','group1-reviewer2','group1-reviewer3'],
          groupB: ['group2-reviewer1'],
          groupC: ['group3-reviewer1','group3-reviewer2','group3-reviewer3']
        }
      }
    })

    // WHEN
    await handlePullRequest(context)

    // THEN
    expect(addAssigneesSpy.mock.calls[0][0].assignees).toHaveLength(1)
    expect(addAssigneesSpy.mock.calls[0][0].assignees[0]).toMatch(/assignee/)

    expect(createReviewRequestSpy.mock.calls[0][0].reviewers).toHaveLength(5)
    expect(createReviewRequestSpy.mock.calls[0][0].reviewers[0]).toMatch(/group1-reviewer/)
    expect(createReviewRequestSpy.mock.calls[0][0].reviewers[2]).toMatch(/group2-reviewer/)
    expect(createReviewRequestSpy.mock.calls[0][0].reviewers[3]).toMatch(/group3-reviewer/)
  })
})
