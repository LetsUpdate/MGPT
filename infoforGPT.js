//This File os only for GPT to get knowledge about how to achive certain things in moodle

// eslint-disable-next-line @typescript-eslint/no-extra-semi
;(function () {
  // CONFIG
  let serverToUse = getJSONVal('serverToUse')
  const defultServers = [
    {
      host: 'piros.trambul.in',
      port: 443,
    },
    {
      host: 'qmining.joesrv.net',
      port: 443,
    },
  ]
  
  // OpenAI Config
  const OPENAI_API_KEY = getVal('openaiApiKey')
  const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions'
  const OPENAI_MODEL = getVal('openaiModel') || 'gpt-3.5-turbo' // More cost-effective default model
  const OPENAI_MODELS = {
    'gpt-4o': { name: 'GPT-4o (Most capable)', cost: 'High' },
    'o4-mini': { name: 'o4-mini (Fast & Cost-effective)', cost: 'Low' }
  }

  const getDefaultServer = () => {
    return defultServers.sort(() => 0.5 - Math.random())[0]
  }

  if (!serverToUse) {
    serverToUse = getDefaultServer()
    setJSONVal('serverToUse', serverToUse)
  }
  const logElementGetting = false
  const logEnabled = true
  const motdShowCount = 5 // Ammount of times to show motd
  let infoExpireTime = 60 * 5
  let p2pInfoExpireTime = 60 * 60 * 24
  let loggedIn = false
  const messageOpacityDelta = 0.1
  const minMessageOpacity = 0.2

  // : ESLINT bs {{{
  // eslint-disable-line
  // GM functions, only to disable ESLINT errors
  /* eslint-disable  */
  const usf = unsafeWindow
  function getVal(name) {
    return GM_getValue(name)
  }
  function getJSONVal(name) {
    try {
      return JSON.parse(GM_getValue(name))
    } catch (e) {
      return null
    }
  }
  function setVal(name, val) {
    return GM_setValue(name, val)
  }
  function setJSONVal(name, val) {
    return GM_setValue(name, JSON.stringify(val))
  }
  function delVal(name) {
    return GM_deleteValue(name)
  }
  function openInTab(address) {
    GM_openInTab(address, false)
  }
  function xmlhttpRequest(opts) {
    GM_xmlhttpRequest(opts)
  }
  function info() {
    return GM_info
  }
  /* eslint-enable */

  // : }}}

  // : Constants and global variables {{{

  // ------------------------------------------------------------------------------
  // Devel vars
  // ------------------------------------------------------------------------------
  // forcing pages for testing. unless you test, do not set these to true!
  const isDevel = false
  const forcedMatchString = isDevel ? 'default' : null
  // only one of these should be true for testing
  const forceTestPage = isDevel && false
  const forceResultPage = isDevel && false
  const forceDefaultPage = isDevel && false
  // ------------------------------------------------------------------------------

  let serverAdress = getPeerUrl(serverToUse)
  let apiAdress = getPeerUrl(serverToUse) + 'api/'
  var addEventListener // add event listener function
  var motd = ''
  var lastestVersion = ''
  var subjInfo
  // array, where elems are added to shadow-root, but its position should be at target.
  var updatableElements = [] // { elem: ..., target: ... }
  var elementUpdaterInterval = -1
  const overlayElemUpdateInterval = 2 // seconds
  var skipAvailablePeerFind = false

  if (isDevel) {
    warn('Moodle script running in developement mode!')
    infoExpireTime = 1
    p2pInfoExpireTime = 1
    const devServerToUse = { host: 'localhost', port: 8080 }
    serverAdress = getPeerUrl(devServerToUse)
    apiAdress = getPeerUrl(devServerToUse) + 'api/'
    setVal('motdcount', 5)
  }

  const currUrl = location.href.includes('file:///')
    ? 'https://elearning.uni-obuda.hu/'
    : location.href

  if (currUrl.includes('.pdf')) return

  // : Localisation {{{

  const huTexts = {
    fatalError:
      'Fatál error. Check console (f12). Kattints az üzenetre az összes kérdés/válaszért manuális kereséshez! (új böngésző tab-ban)',
    consoleErrorInfo: `Itteni hibák 100% a moodle hiba. Kivéve, ha oda van írva hogy script error ;) Ha ilyesmi szerepel itt, akkor olvasd el a segítség szekciót! ${serverAdress}`,
    noResult:
      'Nincs találat :( Kattints az üzenetre az összes kérdés/válaszért manuális kereséshez! (új böngésző tab-ban)',
    videoHelp: 'Miután elindítottad: Play/pause: space. Seek: Bal/jobb nyíl.',
    help: 'Help',
    donate: 'Donate',
    retry: 'Újra',
    invalidPW: 'Hibás jelszó: ',
    loggingIn: 'Belépés ...',
    connecting: 'Csatlakozás: ',
    connect: 'Csatlakozás',
    login: 'Belépés',
    noServer: 'Nem elérhető a szerver!',
    tryingPeer: 'Csatlakozás: ',
    noPeersOnline: 'Egy peer sem elérhető!',
    peerTryingError: 'Hiba peerek keresése közben!',
    pwHere: 'Jelszó ...',
    noParseableQuestionResult:
      'A tesztben nem találhatók kérdések, amit fel lehet dolgozni, vagy hiba történt feldolgozásuk közben',
    unableToParseTestQuestion:
      'Hiba történt a kérdések beolvasása közben :/ Kattints az üzenetre a manuális kereséshez (új böngésző tab-ban)',
    loadingAnswer: 'Válaszok betöltése ...',
    versionUpdated: 'Verzió frissítve ',
    newVersionAvaible: 'Új verzió elérhető: ',
    scriptName: 'Moodle/Elearning/KMOOC segéd ',
    userMOTD: 'Felhasználó MOTD (ezt csak te látod):\n',
    motd: 'MOTD:\n',
    noHostText: '',
    hostHere: 'Qmining szerver domain-je...',
    invalidDomain: 'Hibás domain!\nHelyes formátum: "qmining.com"',
    addNewPeer: 'Új hozzáadása...',
    selectOtherPeer: 'Másik peer...',
    back: 'Vissza',
  }

  var texts = huTexts

  // : }}}

  // : }}}

  // : HTML parsers {{{

  // : Moodle {{{

  // : Basic processing helpers {{{

  function getTextPromisesFromNode(inputNode) {
    const nodes = Array.from(inputNode.childNodes)
      .map((x) => flattenNode(x))
      .flat()

    return nodes.reduce((promises, elem) => {
      let img = elem
      if (elem.tagName !== 'IMG') {
        const t = elem.tagName ? elem.getElementsByTagName('img') : []
        if (t.length > 0) {
          img = t[0]
        }
      }

      const select = elem.tagName ? elem.getElementsByTagName('select') : []
      if (select.length > 0) {
        // test: 2c1d92a7-0ea2-4990-9451-7f19299bbbe4
        const question = []
        Array.from(elem.childNodes).forEach((cn) => {
          if (cn.nodeValue) {
            question.push(cn.nodeValue)
          }
        })
        promises.push({
          type: 'txt',
          val: question.join('...'),
          node: select[0],
        })
        return promises
      }

      if (img.tagName === 'IMG') {
        if (img.title) {
          promises.push({ type: 'txt', val: img.title, node: elem })
        } else {
          const originalBase64 = img.src.startsWith('data:image/')
            ? img.src
            : null

          promises.push(
            new Promise((resolve) => {
              digestMessage(getBase64Image(img)).then((res) => {
                resolve({
                  type: 'img',
                  val: res,
                  node: img,
                  base64: originalBase64,
                })
              })
            })
          )
        }
      } else if (elem.tagName === undefined) {
        promises.push({ type: 'txt', val: elem.nodeValue, node: elem })
      } else {
        promises.push({ type: 'txt', val: elem.innerText, node: elem })
      }

      return promises
    }, [])
  }

  function flattenNode(node) {
    if (node.childNodes && node.childNodes.length > 0) {
      return Array.from(node.childNodes)
        .map((x) => flattenNode(x))
        .flat()
    } else {
      return node
    }
  }

  function makeTextFromElements(acc, item) {
    if (emptyOrWhiteSpace(item.val)) {
      return acc
    }

    if (item.type === 'img') {
      acc.push('[' + item.val + ']')
    } else {
      acc.push(item.val)
    }
    return acc
  }

  function getImagesFromElements(elements) {
    return elements.reduce((acc, element) => {
      if (element.type === 'img') {
        // FIXME: include check needed?
        if (!acc.includes(element.val)) {
          acc.push({
            val: element.val,
            node: element.node,
            base64: element.base64,
          })
        }
      }
      return acc
    }, [])
  }

  function getLegacyImageID(imgArray) {
    try {
      return imgArray.map((img) => {
        if (!img.src.includes('brokenfile')) {
          let filePart = img.src.split('/')
          filePart = filePart[filePart.length - 1]

          // shorten string
          let result = ''
          let i = 0
          while (i < filePart.length && i < 30) {
            result += filePart[i]
            i++
          }

          return decodeURI(result)
        }
      })
    } catch (e) {
      warn(e)
      warn("Couldn't get images from result (old)")
    }
  }

  function getCurrentSubjectName() {
    if (logElementGetting) {
      debugLog('getting current subjects name')
    }
    return document.getElementById('page-header').innerText.split('\n')[0] || ''
  }

  // : }}}

  // : Test page processing functions {{{

  function handleMoodleQuiz() {
    const { removeMessage: removeLoadingMessage } = ShowMessage(
      texts.loadingAnswer
    )

    getQuizData()
      .then((readQuestions) => {
        if (readQuestions.length === 0) {
          warn('readQuestions length is zero, no questions found on page!')
          ShowMessage(
            texts.unableToParseTestQuestion,

            undefined,
            () => {
              OpenErrorPage({
                message: 'No result found',
              })
            }
          )
          return
        }

        const questions = readQuestions.map((question) => {
          return {
            Q: question.question,
            data: Object.assign(
              {},
              {
                possibleAnswers: question.possibleAnswers,
              },
              question.data
            ),
          }
        })

        const sentData = {
          questions: questions,
          subj: getCurrentSubjectName(),
          testUrl: currUrl,
          version: info().script.version,
          cid: getCid(),
          uid: getUid(),
        }

        log('Sent data', sentData)
        post('ask', sentData).then(async (results) => {
          // Check if we got any answers from the original API
          if (results.some(r => !r.answers || r.answers.length === 0)) {
            // For each question without an answer, try GPT-4
            const enhancedResults = await Promise.all(results.map(async (result, idx) => {
              if (!result.answers || result.answers.length === 0) {
                try {
                  const question = sentData.questions[idx].Q;
                  const gptAnswer = await askGPT4(question);
                  
                  if (gptAnswer) {
                    // Format the GPT answer to match the expected structure
                    return {
                      answers: [{
                        q: {
                          Q: question,
                          A: gptAnswer,
                          data: {
                            type: 'simple',
                            source: 'gpt4'
                          }
                        },
                        match: 100,
                        detailedMatch: {
                          matchedSubjName: 'GPT-4',
                          qdb: 'AI Generated'
                        }
                      }]
                    };
                  }
                } catch (error) {
                  warn('Error getting GPT-4 answer:', error);
                }
              }
              return result;
            }));
            
            results = enhancedResults;
          }

          removeLoadingMessage()
          ShowAnswers(
            results.map((res, i) => {
              return {
                answers: res.answers,
                question: readQuestions[i],
              }
            })
          )
        })
      })
      .catch((err) => {
        warn(err)
        warn('Error in handleMoodleQuiz()')
      })
  }

  const questionNodeVariants = {
    hasInformationText: {
      criteria: () => {
        const firstChild =
          document.getElementsByTagName('form')[1].childNodes[0].childNodes[0]
        if (!firstChild.className.includes('informationitem')) {
          return false
        }
        const questionNodes = Array.from(
          document.getElementsByTagName('form')[1].childNodes[0].childNodes
        )
        return questionNodes.length > 0
      },
      getter: () => {
        return Array.from(
          document.getElementsByTagName('form')[1].childNodes[0].childNodes
        ).filter((node) => {
          return !node.className.includes('informationitem')
        })
      },
    },
    formFirst: {
      criteria: () => {
        const questionNodes = Array.from(
          document.getElementsByTagName('form')[0].childNodes[0].childNodes
        )
        // test: e2c01ff4-d97a-4ab9-8f7f-e28812541097
        const notOnlyTextNodes = questionNodes.every((node) => {
          return node.tagName !== undefined
        })
        return notOnlyTextNodes && questionNodes.length > 0
      },
      getter: () => {
        return Array.from(
          document.getElementsByTagName('form')[0].childNodes[0].childNodes
        )
      },
    },
    formSecond: {
      criteria: () => {
        const questionNodes = Array.from(
          document.getElementsByTagName('form')[1].childNodes[0].childNodes
        )
        return questionNodes.length > 0
      },
      getter: () => {
        return Array.from(
          document.getElementsByTagName('form')[1].childNodes[0].childNodes
        )
      },
    },
  }

  function getQuestionNodes() {
    try {
      let questionNodes
      Object.keys(questionNodeVariants).some((key) => {
        const variant = questionNodeVariants[key]
        let criteriaPassed = false
        try {
          criteriaPassed = variant.criteria()
        } catch (e) {
          debugLog('Criteria check failed with error (question nodes)', e)
        }
        if (criteriaPassed) {
          questionNodes = variant.getter()
          if (questionNodes.length === 0) {
            warn(
              `question nodes ${key} criteria was true, but result is an empty array!`
            )
          } else {
            debugLog(`Using question node getter variant: ${key}`)
            return true
          }
        }
      })
      return questionNodes
    } catch (e) {
      warn('Error in getQuestionNodes')
      warn(e)
    }
  }

  function getQuizData() {
    return new Promise((resolve) => {
      // TODO: dropdown in question
      // TODO: get possible answers too
      const promises = []
      const questionNodes = getQuestionNodes()

      let i = 0
      while (
        i < questionNodes.length &&
        questionNodes[i].tagName === 'DIV' &&
        questionNodes[i].className !== 'submitbtns'
      ) {
        promises.push(getQuestionPromiseForSingleQuestion(questionNodes[i]))
        i++
      }

      Promise.all(promises)
        .then((result) => {
          const errorsRemoved = result.reduce((acc, res) => {
            if (res.success) {
              acc.push(res)
            }
            return acc
          }, [])
          resolve(errorsRemoved)
        })
        .catch((err) => {
          warn('Error in handleMoodleQuiz()')
          warn(err)
        })
    })
  }

  function getPossibleAnswersFromTest(node) {
    try {
      const promises = []
      let answerRoot = node.getElementsByClassName('answer')[0]

      if (!answerRoot) {
        answerRoot = node.getElementsByClassName('subquestion')[0]
        if (answerRoot) {
          // FIXME: is this needed, what is this lol
          const options = Array.from(answerRoot.getElementsByTagName('option'))
          const possibleAnswers = options.reduce((acc, option) => {
            if (!emptyOrWhiteSpace(option.innerText)) {
              acc.push([{ type: 'txt', val: option.innerText }])
            }
            return acc
          }, [])

          return possibleAnswers
        } else {
          const select = node.getElementsByTagName('select')[0]
          if (select) {
            const options = []
            Array.from(select).forEach((opt) => {
              if (!emptyOrWhiteSpace(opt.innerText)) {
                options.push([{ type: 'txt', val: opt.innerText }])
              }
            })
            return options
          }
        }
      } else if (answerRoot.tagName === 'DIV') {
        const answers = Array.from(answerRoot.childNodes)

        answers.forEach((answer) => {
          if (answer.tagName) {
            promises.push(getTextPromisesFromNode(answer))
          }
        })

        return promises
      } else if (answerRoot.tagName === 'TABLE') {
        const answers = Array.from(answerRoot.childNodes[0].childNodes)
        // test: 002203ca-581b-445c-b45d-85374f212e8e NOT WORING

        answers.forEach((answer) => {
          if (answer.tagName) {
            // test: 817434df-a103-4edc-870e-c9ac953404dc
            promises.push(
              getTextPromisesFromNode(answer.getElementsByClassName('text')[0])
            )
            // here elements with classname 'control' could be added too. Those should be a dropdown,
            // containing possible choices
          }
        })

        return promises
      }
    } catch (e) {
      warn('Error in getPossibleAnswersFromTest()!')
      warn(e)
    }
  }

  function getImgNodesFromArray(arr) {
    return arr.reduce((acc, x) => {
      if (Array.isArray(x)) {
        x.forEach((y) => {
          if (y.type === 'img') {
            acc.push(y.node)
          }
        })
      } else {
        if (x.type === 'img') {
          acc.push(x.node)
        }
      }
      return acc
    }, [])
  }

  const rootVariants = {
    qtext: {
      criteria: (node) => {
        return node.getElementsByClassName('qtext').length > 0
      },
      getter: (node) => {
        return node.getElementsByClassName('qtext')[0]
      },
    },
    subquestion: {
      criteria: (node) => {
        return node.getElementsByClassName('subquestion').length > 0
      },
      getter: (node) => {
        return node.getElementsByClassName('subquestion')[0].parentNode
      },
    },
    content: {
      // test: 002203ca-581b-445c-b45d-85374f212e8e
      criteria: (node) => {
        return node.getElementsByClassName('content').length > 0
      },
      getter: (node) => {
        const content = node.getElementsByClassName('content')[0].childNodes[0]
        const pNodes = Array.from(content.childNodes).filter((node) => {
          return node.tagName === 'P'
        })

        const parent = document.createElement('div')
        pNodes.forEach((node) => {
          parent.appendChild(node.cloneNode(true))
        })

        return pNodes[0]
      },
    },
  }

  function getQuestionRootNode(node) {
    try {
      let qtextNode
      Object.keys(rootVariants).some((key) => {
        const variant = rootVariants[key]
        if (variant.criteria(node)) {
          qtextNode = variant.getter(node)
          if (!qtextNode) {
            warn(
              `question root node ${key} criteria was true, but result is null`
            )
          } else {
            return true
          }
        }
      })
      return qtextNode
    } catch (e) {
      warn('Error in getQuestionRootNode')
      warn(e)
    }
  }

  function getQuestionPromiseForSingleQuestion(node) {
    return new Promise((resolve) => {
      try {
        const qtextNode = getQuestionRootNode(node)
        const questionPromises = getTextPromisesFromNode(qtextNode)
        const possibleAnswerPromises = getPossibleAnswersFromTest(node)

        const unflattenedPossibleAnswerPromises = possibleAnswerPromises
          ? possibleAnswerPromises.map((x) => {
              return Promise.all(x)
            })
          : []

        Promise.all([
          Promise.all(questionPromises),
          Promise.all(unflattenedPossibleAnswerPromises),
        ])
          .then(([question, possibleAnswerArray]) => {
            const questionText = removeUnnecesarySpaces(
              question.reduce(makeTextFromElements, []).join(' ')
            )
            const possibleAnswers = possibleAnswerArray.map((x) => {
              return {
                type: 'txt',
                val: removeUnnecesarySpaces(
                  x.reduce(makeTextFromElements, []).join(' ')
                ),
              }
            })
            const images = getImagesFromElements([
              ...question,
              ...possibleAnswerArray.reduce((acc, x) => {
                return [...acc, ...x]
              }, []),
            ])
            const imageNodes = getImgNodesFromArray([
              ...question,
              ...possibleAnswerArray,
            ])
            const data = getDataFromTest(
              question,
              images,
              getLegacyImageID(imageNodes)
            )

            resolve({
              question: questionText,
              possibleAnswers: possibleAnswers,
              images: images,
              data: data,
              success: true,
            })
          })
          .catch((err) => {
            warn('Error in getQuestionPromiseForSingleQuestion()')
            warn(err)
            resolve({ success: false })
          })
      } catch (err) {
        warn('Error in getQuestionPromiseForSingleQuestion()')
        warn(err)
        resolve({ success: false })
      }
    })
  }

  function getDataFromTest(questions, hashedImages, legacyImages) {
    if (hashedImages.length > 0) {
      return {
        type: 'image',
        hashedImages: hashedImages.map((x) => {
          return x.val
        }),
        images: legacyImages,
        base64: questions
          .map((x) => {
            return x.base64
          })
          .filter((x) => !!x),
      }
    } else {
      return {
        type: 'simple',
      }
    }
  }

  // : }}}

  // : Result page processing functions {{{

  const resultNodeVariants = questionNodeVariants

  function getResultNodes() {
    try {
      let resultNodes
      Object.keys(resultNodeVariants).some((key) => {
        const variant = resultNodeVariants[key]
        let criteriaPassed = false
        try {
          criteriaPassed = variant.criteria()
        } catch (e) {
          debugLog('Criteria check failed with error (result nodes)', e)
        }
        if (criteriaPassed) {
          resultNodes = variant.getter()
          if (resultNodes.length === 0) {
            warn(
              `result nodes ${key} criteria was true, but result is an empty array!`
            )
          } else {
            debugLog(`Using question node getter variant: ${key}`)
            return true
          }
        }
      })
      return resultNodes
    } catch (e) {
      warn('Error in getResultNodes')
      warn(e)
    }
  }

  function getQuiz() {
    return new Promise((resolve) => {
      const promises = []
      const questionNodes = getResultNodes()
      // let questionNodes = Array.from(
      //   document.getElementsByTagName('form')[0].childNodes[0].childNodes
      // )
      // if (questionNodes.length === 0) {
      //   questionNodes = Array.from(
      //     document.getElementsByTagName('form')[1].childNodes[0].childNodes
      //   )
      // }

      let i = 0
      while (i < questionNodes.length && questionNodes[i].tagName === 'DIV') {
        promises.push(getQuizFromNode(questionNodes[i]))
        i++
      }

      Promise.all(promises)
        .then((result) => {
          const errorsRemoved = result.reduce((acc, res) => {
            if (res.success) {
              acc.push(res)
            }
            return acc
          }, [])
          resolve(errorsRemoved)
        })
        .catch((err) => {
          warn('Error in getQuiz()')
          warn(err)
        })
    })
  }

  function getPromisesThatMeetsRequirements(getters, node) {
    let res
    Object.keys(getters).some((key) => {
      const getter = getters[key]
      if (getter.requirement(node)) {
        try {
          res = getter.getterFunction(node)
          debugLog(`[Question getter] Using ${key}`)
          return true
        } catch (e) {
          debugLog(`[Question getter] ${key} failed`)
        }
      } else {
        debugLog(`[Question getter] ${key} did not pass`)
      }
    })

    return res
  }

  function getQuizFromNode(node) {
    return new Promise((resolve) => {
      try {
        const questionPromises = getPromisesThatMeetsRequirements(
          questionGetters,
          node
        )
        const answerPromises = getPromisesThatMeetsRequirements(
          answerGetters,
          node
        )
        const possibleAnswers = getPossibleAnswers(node)

        if (!answerPromises || !questionPromises) {
          debugLog('Answer or question array is empty, skipping question')
          resolve({ success: false })
        }

        Promise.all([
          Promise.all(questionPromises),
          Promise.all(answerPromises),
        ])
          .then(([question, answer]) => {
            const questionText = question
              .reduce(makeTextFromElements, [])
              .join(' ')
            const answerText = answer.reduce(makeTextFromElements, []).join(' ')
            const images = getImagesFromElements([...question, ...answer])

            const result = {
              Q: removeUnnecesarySpaces(questionText),
              A: removeUnnecesarySpaces(answerText),
              data: getDataFromResultImages(images),
              success: true,
            }
            result.data.possibleAnswers = possibleAnswers
            resolve(result)
          })
          .catch((err) => {
            warn('Error in getQuizFromNode() (creating question)')
            warn(err)
            resolve({ success: false })
          })
      } catch (e) {
        warn('Error in getQuizFromNode() (creating promises)')
        warn(e)
        warn(node)
      }
    })
  }

  function getDataFromResultImages(images) {
    if (images && images.length > 0) {
      return {
        type: 'image',
        hashedImages: images.map((x) => {
          return x.val
        }),
        source: 'script',
      }
    } else {
      return {
        type: 'simple',
        source: 'script',
      }
    }
  }

  const questionGetters = {
    getSimpleQuestion: {
      description: 'Basic question getter',
      requirement: (node) => {
        return node.getElementsByClassName('qtext').length > 0
      },
      getterFunction: (node) => {
        const question = node.getElementsByClassName('qtext')[0]
        return getTextPromisesFromNode(question)
      },
    },
  }

  const answerGetters = {
    getSimpleAnswer: {
      description: 'Basic answer getter',
      requirement: (node) => {
        return node.getElementsByClassName('rightanswer').length > 0
      },
      getterFunction: (node) => {
        const answer = node.getElementsByClassName('rightanswer')[0]
        return getTextPromisesFromNode(answer)
      },
    },
    noCorrect: {
      description: 'Gets correct answer, even if the correct is not shown',
      requirement: (node) => {
        return (
          node.getElementsByClassName('rightanswer').length === 0 &&
          node.getElementsByClassName('answer').length > 0
        )
      },
      getterFunction: (node) => {
        const possibleAnswers = getPossibleAnswers(node)

        if (getIfSolutionIsCorrect(node)) {
          if (possibleAnswers.length === 2) {
            return [
              {
                type: 'txt',
                val: possibleAnswers.find((x) => {
                  return x.selectedByUser === false
                }).text,
              },
            ]
          }
        } else {
          const state = node.getElementsByClassName('state')[0]
          if (state && state.innerText === 'Hibás') {
            return false
          }
          return [
            {
              type: 'txt',
              val: possibleAnswers.find((x) => {
                return x.selectedByUser === true
              }).text,
            },
          ]
        }
      },
    },
    /* getDropdownAnswer: {
      description: 'Dropdown answer getter',
      requirement: (node) => {
        return false
      },
      getterFunction: (node) => {
        // TODO dropdown kérdés.html
        return 'asd'
      },
    },
    getTextareaAnswer: {
      description: 'Get complex answer',
      requirement: (node) => {
        return false
      },
      getterFunction: (node) => {
        // TODO Ugrás... bug.html
        return 'asd'
      },
    },
    getDragBoxAnswer: {
      description: 'Get complex answer',
      requirement: (node) => {
        return false
      },
      getterFunction: (node) => {
        // TODO dragboxes
        return 'asd'
      }, 
    },*/
  }

  function getIfSolutionIsCorrect(node) {
    const gradeText = node.getElementsByClassName('grade')[0].innerText
    const stateText = node.getElementsByClassName('state')[0].innerText
    return !(stateText.includes('Helyes') || !gradeText.includes('0,00'))
  }

  function getPossibleAnswers(node) {
    try {
      if (node.getElementsByClassName('answer').length > 0) {
        const answerNodes = Array.from(
          node.getElementsByClassName('answer')[0].childNodes
        )

        return answerNodes.reduce((acc, answerNode) => {
          let selectedByUser
          if (answerNode.childNodes.length > 0) {
            selectedByUser = answerNode.childNodes[0].checked
          }

          const text = removeUnnecesarySpaces(answerNode.innerText)

          if (text !== '') {
            acc.push({
              text: text,
              selectedByUser: selectedByUser,
            })
          }
          return acc
        }, [])
      } else {
        const select = node.getElementsByTagName('select')[0]
        if (select) {
          const options = []
          Array.from(select.childNodes).forEach((opt) => {
            if (!emptyOrWhiteSpace(opt.innerText)) {
              options.push(opt.innerText)
            }
          })
          return options
        }
      }
    } catch (e) {
      warn('Error in getPossibleAnswers()!')
      warn(e)
      warn(node)
    }
  }

  function digestMessage(message) {
    return new Promise((resolve) => {
      const encoder = new TextEncoder()
      const data = encoder.encode(message)
      crypto.subtle.digest('SHA-256', data).then((buf) => {
        let res = String.fromCharCode.apply(null, new Uint8Array(buf))
        res = btoa(res)
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
        resolve(res)
      })
    })
  }

  function getBase64Image(img) {
    img.crossOrigin = 'Anonymous'
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const dataURL = canvas.toDataURL('image/png')
    img.crossOrigin = undefined
    return dataURL.replace(/^data:image\/(png|jpg);base64,/, '')
  }

  // : }}}

  // : }}}

  // : AVR {{{

  function getAVRTextFromImg(img) {
    return decodeURIComponent(img.src).split('|')[1]
  }

  function getAVRPossibleAnswersFromQuiz() {
    let i = 1
    let currElem = null
    const elems = []
    do {
      currElem = document.getElementsByClassName(`kvalasz${i}`)[0]
      if (currElem) {
        const img = currElem.getElementsByTagName('img')[0]
        if (img) {
          elems.push({ type: 'txt', val: getAVRTextFromImg(img) })
        } else {
          elems.push({ type: 'txt', val: currElem.innerText })
        }
      }
      i++
    } while (currElem !== undefined)
    return elems
  }

  function getAVRQuestionFromQuiz() {
    const q = document.getElementsByClassName('kkerdes')[0]
    const img = q.getElementsByTagName('img')[0]
    if (img) {
      return getAVRTextFromImg(img)
    } else {
      return simplifyAVRQuestionString(q.innerText)
    }
  }

  function getAVRSubjName() {
    return document.getElementsByTagName('header')[0].innerText
  }

  function HandleAVRResults(url) {
    const tableChilds =
      document.getElementsByTagName('table')[0].childNodes[0].childNodes
    const question = removeUnnecesarySpaces(
      tableChilds[0].innerText.split(':')[1]
    )
    const answer = removeUnnecesarySpaces(
      tableChilds[1].innerText.split(':')[1]
    )
    const correct = removeUnnecesarySpaces(
      tableChilds[2].innerText.split(':')[1]
    )
    if (correct.toLowerCase() === 'helyes') {
      const sentData = {
        subj: getAVRSubjName(),
        version: info().script.version,
        id: getCid(),
        location: url,
        quiz: [
          {
            Q: question.includes('.')
              ? question.split('.').splice(1).join('.').trim()
              : question,
            A: answer,
            data: {
              type: 'simple',
              date: new Date().getTime(),
              source: 'script',
            },
          },
        ],
      }

      log(sentData)
      post('isAdding', sentData).then((res) => {
        ShowSaveQuizDialog(res.success, sentData, res.totalNewQuestions)
      })
    } else {
      ShowMessage('Nem eldönthető a helyes válasz')
    }
  }

  function simplifyAVRQuestionString(val) {
    // FIXME: this is ugly
    let x = val.split('\n')
    x.shift()
    x = x.join('\n').split(' ')
    x.pop()
    return x.join(' ')
  }

  function determineCurrentSite() {
    const tdElems = document.getElementsByTagName('td')
    const kkerdesElements = document.getElementsByClassName('kkerdes')
    if (kkerdesElements.length > 0) {
      return 'TEST'
    } else if (tdElems.length === 10) {
      return 'RESULT'
    } else {
      return 'UI'
    }
  }

  function handleAVRSite(url) {
    let prevLength = -1

    const handler = () => {
      const kkerdesElements = document.getElementsByClassName('kkerdes')
      if (prevLength !== kkerdesElements.length) {
        prevLength = kkerdesElements.length
        clearAllMessages()
        if (determineCurrentSite() === 'TEST') {
          debugLog('AVR: handling test')
          handleAVRQuiz(url)
        } else if (determineCurrentSite() === 'RESULT') {
          debugLog('AVR: handling result')
          HandleAVRResults(url)
        } else {
          debugLog('AVR: handling UI')
          HandleUI()
        }
      }
      setTimeout(handler, 1 * 1000)
    }

    handler()
  }

  function handleAVRQuiz(url) {
    try {
      const { removeMessage: removeLoadingMessage } = ShowMessage(
        texts.loadingAnswer
      )
      const possibleAnswers = getAVRPossibleAnswersFromQuiz()
      const question = getAVRQuestionFromQuiz()

      const sentData = {
        questions: [
          {
            Q: question,
            subj: 'AVR',
            data: { type: 'simple', possibleAnswers: possibleAnswers },
          },
        ],
        testUrl: url,
      }

      log('Sent data', sentData)
      post('ask', sentData).then((results) => {
        removeLoadingMessage()
        ShowAnswers(
          results.map((res, i) => {
            return {
              answers: res.answers,
              question: sentData.questions[i],
            }
          })
        )
      })
    } catch (e) {
      warn('Error in handleAVRQuiz')
      warn(e)
    }
  }

  // : }}}

  // : Canvas {{{

  function handleCanvasQuiz() {
    console.trace()
  }

  function HandleCanvasResults() {
    console.trace()
  }

  // : }}}

  // : Misc {{{

  function getVideo() {
    if (logElementGetting) {
      debugLog('getting video stuff')
    }
    return document.getElementsByTagName('video')[0]
  }

  function getVideoElement() {
    if (logElementGetting) {
      debugLog('getting video element')
    }
    return document.getElementById('videoElement').parentNode
  }

  // : }}}

  // : }}}

  // : Stealth by An0 with love {{{

  function StealthOverlay() {
    //call this before the document scripts
    const document = window.document

    const neverEqualPlaceholder = Symbol(`never equal`) //block probing for undefined values in the hooks
    let shadowRootHost = neverEqualPlaceholder
    let shadowRootNewHost = neverEqualPlaceholder

    const apply = Reflect.apply //save some things in case they get hooked (only for unsafe contexts)

    if (usf.Error.hasOwnProperty('stackTraceLimit')) {
      Reflect.defineProperty(usf.Error, 'stackTraceLimit', {
        value: undefined,
        writable: false,
        enumerable: false,
        configurable: false,
      })
    }

    const shadowGetHandler = {
      apply: (target, thisArg, argumentsList) =>
        apply(
          target,
          thisArg === shadowRootHost ? shadowRootNewHost : thisArg,
          argumentsList
        ),
    }

    const original_attachShadow = usf.Element.prototype.attachShadow
    const attachShadowProxy = new Proxy(original_attachShadow, shadowGetHandler)
    usf.Element.prototype.attachShadow = attachShadowProxy

    const getShadowRootProxy = new Proxy(
      Object.getOwnPropertyDescriptor(usf.Element.prototype, 'shadowRoot').get,
      shadowGetHandler
    )
    Object.defineProperty(usf.Element.prototype, 'shadowRoot', {
      get: getShadowRootProxy,
    })

    const getHostHandler = {
      apply: function () {
        const result = apply(...arguments)
        return result === shadowRootNewHost ? shadowRootHost : result
      },
    }
    const getHostProxy = new Proxy(
      Object.getOwnPropertyDescriptor(usf.ShadowRoot.prototype, 'host').get,
      getHostHandler
    )
    Object.defineProperty(usf.ShadowRoot.prototype, 'host', {
      get: getHostProxy,
    })

    const shadowRootSetInnerHtml = Object.getOwnPropertyDescriptor(
      ShadowRoot.prototype,
      'innerHTML'
    ).set
    const documentFragmentGetChildren = Object.getOwnPropertyDescriptor(
      DocumentFragment.prototype,
      'children'
    ).get
    const documentGetBody = Object.getOwnPropertyDescriptor(
      Document.prototype,
      'body'
    ).get
    const nodeAppendChild = Node.prototype.appendChild

    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:absolute;left:0;top:0'

    const addOverlay = () => {
      shadowRootHost = apply(documentGetBody, document, [])
      const shadowRoot = apply(original_attachShadow, shadowRootHost, [
        { mode: 'closed' },
      ])
      apply(shadowRootSetInnerHtml, shadowRoot, [`<div><slot></slot></div>`])
      shadowRootNewHost = apply(documentFragmentGetChildren, shadowRoot, [])[0]
      apply(nodeAppendChild, shadowRoot, [overlay])
    }

    if (!document.body) {
      document.addEventListener('DOMContentLoaded', addOverlay)
    } else {
      addOverlay()
    }
    return overlay
  }

  const overlay = StealthOverlay()

  function createHoverOver(appendTo) {
    const overlayElement = document.createElement('div')
    overlay.append(overlayElement)

    updatableElements.push({ elem: overlayElement, target: appendTo })

    if (elementUpdaterInterval === -1) {
      elementUpdaterInterval = setInterval(() => {
        updatableElements.forEach(({ elem, target }) => {
          let { left, top } = target.getBoundingClientRect()
          const { width, height } = target.getBoundingClientRect()
          left += window.scrollX
          top += window.scrollY

          SetStyle(elem, {
            pointerEvents: 'none',
            userSelect: 'none',
            position: 'absolute',
            zIndex: 999999,
            top: top + 'px',
            left: left + 'px',
            width: width + 'px',
            height: height - 10 + 'px',
          })
        })
      }, overlayElemUpdateInterval * 1000)
    }

    return overlayElement
  }

  function appendBelowElement(el, toAppend) {
    const rect = el.getBoundingClientRect()
    const correction = 8
    const left = rect.left + window.scrollX - correction
    const top = rect.top + window.scrollY - correction

    SetStyle(toAppend, {
      position: 'absolute',
      zIndex: 1,
      top: top + 'px',
      left: left + 'px',
    })

    overlay.appendChild(toAppend)
  }

  // : }}}

  // : Main logic stuff {{{

  // : Main function {{{

  // window.addEventListener("load", () => {})
  Main()

  function preventWindowClose() {
    usf.close = () => {
      log('Prevented window.close() ...')
    }
  }

  function Main() {
    'use strict'

    log('Moodle / E-Learning script')
    preventWindowClose()

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', Init)
    } else {
      Init()
    }
  }

  const pageMatchers = [
    {
      matchString: 'canvas',
      testPage: {
        match: (url) => {
          return false // TODO :insert real url
        },
        action: (url) => {
          debugLog('Handling canvas quiz')
          handleCanvasQuiz(url)
        },
      },
      resultPage: {
        match: (url) => {
          return false // TODO :insert real url
        },
        action: (url) => {
          debugLog('Handling canvas results')
          HandleCanvasResults(url)
        },
      },
      default: {
        match: (url) => {
          return false // TODO :insert real url
        },
        action: (url) => {
          debugLog('Handling canvas default action')
          HandleUI(url)
        },
      },
    },
    {
      matchString: 'portal.kgk',
      // testPage: {
      //   match: (url) => {
      //     return url.includes('vizsga')
      //   },
      //   action: (url) => {
      //     handleAVRSite(url)
      //   },
      // },
      // resultPage: {
      //   match: (url) => {
      //     return false // TODO :insert real url
      //   },
      //   action: (url) => {
      //     handleAVRSite(url)
      //   },
      // },
      default: {
        match: (url) => {
          return true // TODO :insert real url
        },
        action: (url) => {
          debugLog('Handling AVR default action')
          handleAVRSite(url)
        },
      },
    },
    {
      matchString: 'default', // moodle, elearning, mooc
      testPage: {
        match: (url) => {
          return (
            (url.includes('/quiz/') && url.includes('attempt.php')) ||
            forceTestPage
          )
        },
        action: () => {
          debugLog('Handling moodle quiz')
          handleMoodleQuiz()
        },
      },
      resultPage: {
        match: (url) => {
          return (
            (url.includes('/quiz/') && url.includes('review.php')) ||
            forceResultPage
          )
        },
        action: (url) => {
          debugLog('Handling moodle results')
          HandleMoodleResults(url)
        },
      },
      default: {
        match: (url) => {
          return (
            (!url.includes('/quiz/') && !url.includes('review.php')) ||
            forceDefaultPage
          )
        },
        action: (url) => {
          debugLog('Handling moodle default action')
          HandleUI(url)
        },
      },
    },
  ]

  function AfterLoad() {
    const url = currUrl

    try {
      pageMatchers.some((matcher) => {
        if (
          url.includes(matcher.matchString) ||
          matcher.matchString === 'default' ||
          matcher.matchString.includes(forcedMatchString)
        ) {
          debugLog(`trying '${matcher.matchString}'`)
          if (matcher.testPage && matcher.testPage.match(url)) {
            matcher.testPage.action(url)
            return true
          } else if (matcher.resultPage && matcher.resultPage.match(url)) {
            matcher.resultPage.action(url)
            return true
          } else if (matcher.default && matcher.default.match(url)) {
            matcher.default.action(url)
            return true
          } else {
            warn(
              'Matcher did not have matched handler implemented, or there was no match!',
              matcher
            )
          }
        }
      })
    } catch (e) {
      ShowMessage(texts.fatalError, undefined, () => {
        OpenErrorPage(e)
      })
      Exception(e, 'script error at main:')
    }
    if (url.includes('eduplayer')) {
      AddVideoHotkeys(url)
    } // adding video hotkeys
    log(texts.consoleErrorInfo)
  }
  // : }}}

  // : Loading {{{
  function Init() {
    try {
      addEventListener = (function () {
        if (document.addEventListener) {
          return function (element, event, handler) {
            element.addEventListener(event, handler, false)
          }
        } else {
          return function (element, event, handler) {
            element.attachEvent('on' + event, handler)
          }
        }
      })()
    } catch (e) {
      Exception(e, 'script error at addEventListener:')
    }

    ShowMenu()

    if (!serverToUse) {
      addNewHost()
      return
    }

    ConnectToServer()
  }

  function Auth(pw) {
    SafeGetElementById('infoMainDiv', (elem) => {
      elem.innerText = texts.loggingIn
    })
    post('login', { pw: pw, script: true }).then((res) => {
      if (res.result === 'success') {
        infoExpireTime = -1
        p2pInfoExpireTime = -1
        ConnectToServer()
      } else {
        SafeGetElementById('infoMainDiv', (elem) => {
          elem.innerText = texts.invalidPW + pw
        })
      }
    })
  }

  function handleDeprecatedServer() {
    const peers = getJSONVal('peers')
    if (!peers) return
    const newPeers = peers.filter((x) => {
      return x.host !== serverToUse.host && x.port !== serverToUse.port
    })

    const removedCurrentPeer = peers.length > newPeers.length

    if (removedCurrentPeer) {
      serverToUse = getDefaultServer()
      if (newPeers.length === 0) {
        newPeers.push(serverToUse)
      }

      setJSONVal('peers', newPeers)
      setJSONVal('serverToUse', serverToUse)
      serverAdress = getPeerUrl(serverToUse)
      apiAdress = getPeerUrl(serverToUse) + 'api/'

      infoExpireTime = 0
      p2pInfoExpireTime = 0
    }

    return removedCurrentPeer
  }

  function ConnectToServer() {
    clearAllMessages()
    resetMenu()

    GetXHRInfos()
      .then((inf) => {
        try {
          addPeerToSavedPeersIfNotExists(serverToUse)
          SafeGetElementById('peerSelector', (elem) => {
            updatePeerSelector(elem)
          })

          if (inf.result === 'nouser') {
            NoUserAction()
            return
          }

          if (inf.isDeprecated) {
            const hadDeprecatedServer = handleDeprecatedServer()
            if (hadDeprecatedServer) {
              log('Removed deprecated server')
              ConnectToServer()
              return
            }
          }

          loggedIn = true
          lastestVersion = inf.version.replace(/\n/g, '')
          motd = inf.motd
          if (getUid() !== inf.uid) {
            setVal('userId', inf.uid)
          }
          subjInfo = inf.subjinfo
          setVal('userId', inf.uid)
          SafeGetElementById('infoMainDiv', (elem) => {
            elem.innerText = `${subjInfo.subjects.toLocaleString()} tárgy, ${subjInfo.questions.toLocaleString()} kérdés`
          })

          getPeers()
            .then(() => {
              SafeGetElementById('peerSelector', (elem) => {
                updatePeerSelector(elem)
              })
            })
            .catch(() => warn('unable to get p2p info'))
          SafeGetElementById('peerSelector', (elem) => {
            elem.style.display = ''
          })
          AfterLoad()
          registerScript()
        } catch (e) {
          warn(e)
        }
      })
      .catch((e) => {
        warn(e)
        SafeGetElementById('infoMainDiv', (elem) => {
          elem.innerText = texts.noServer
        })

        if (skipAvailablePeerFind || !getVal('peers')) {
          connectionErrorAction()
        } else {
          tryAnotherPeer()
        }
      })
  }

  async function tryAnotherPeer() {
    debugLog('Unable to connect to main server, trying peers')
    try {
      const peers = getJSONVal('peers')
      if (!peers || peers.length === 0) {
        debugLog('No saved p2p info available!')
        return
      }
      debugLog('Saved peers: ', peers)
      const shuffledPeers = peers.sort(() => 0.5 - Math.random())

      let suitablePeer = null
      let i = 0
      while (suitablePeer === null && i < shuffledPeers.length) {
        const peer = shuffledPeers[i]
        i++

        const url = getPeerUrl(peer)
        SafeGetElementById('infoMainDiv', (elem) => {
          elem.innerText = texts.tryingPeer + getShortServerURL(url)
        })
        debugLog('Trying ' + url)

        try {
          const res = await head(url)
          if (res.status === 401) {
            debugLog(url + ' responded with ' + res.status)
          } else if (res.status === 200) {
            suitablePeer = peer
          }
        } catch (e) {
          debugLog('Unable to connect!')
        }
      }

      if (suitablePeer) {
        debugLog(
          'Found suitable peer with URL: ' +
            getPeerUrl(suitablePeer) +
            'index: ' +
            i
        )
        connectToPeer(suitablePeer)
      } else {
        connectionErrorAction(texts.noPeersOnline)
        debugLog('None of the peers are online!')
      }
    } catch (e) {
      connectionErrorAction(texts.peerTryingError)
      warn('Error ocurred during trying to connect to peers!')
      warn(e)
    }
  }

  function addPeerToSavedPeersIfNotExists(peer) {
    const peers = getJSONVal('peers') || []
    const peerAlreadyExists = peers.find((x) => {
      return getPeerUrl(x) === getPeerUrl(peer)
    })
    if (!peerAlreadyExists) {
      setJSONVal('peers', [peer, ...peers])
      SafeGetElementById('peerSelector', (elem) => {
        updatePeerSelector(elem)
      })
    }
  }

  function connectToPeer(peer) {
    const url = getPeerUrl(peer)
    serverAdress = url
    apiAdress = url + 'api/'

    serverToUse = peer
    setVal('serverToUse', JSON.stringify(peer))
    p2pInfoExpireTime = 0
    setVal('lastp2pchecktime', 0)
    infoExpireTime = 0
    setVal('lastInfoCheckTime', 0)

    ConnectToServer()
  }

  function resetMenu() {
    SafeGetElementById('scriptMenuDiv', (elem) => {
      elem.style.backgroundColor = '#262626'
    })
    SafeGetElementById('peerSelector', (elem) => {
      elem.style.display = 'none'
    })
    SafeGetElementById('retryContainer', (elem) => {
      elem.style.display = 'none'
    })
    SafeGetElementById('loginDiv', (elem) => {
      elem.style.display = 'none'
    })
    SafeGetElementById('hostInputContainer', (elem) => {
      elem.style.display = 'none'
    })
    SafeGetElementById('buttonContainer', (elem) => {
      elem.style.display = 'flex'
    })
    SafeGetElementById('infoMainDiv', (elem) => {
      elem.innerText = texts.connecting + getShortServerURL(serverAdress)
    })
  }

  function connectionErrorAction(infoText) {
    SafeGetElementById('infoMainDiv', (elem) => {
      elem.innerText = infoText || texts.noServer
    })
    SafeGetElementById('retryContainer', (elem) => {
      elem.style.display = 'flex'
    })
    SafeGetElementById('peerSelector', (elem) => {
      elem.style.display = ''
    })
    SafeGetElementById('scriptMenuDiv', (elem) => {
      elem.style.backgroundColor = 'red'
    })
  }

  function NoUserAction() {
    SafeGetElementById('scriptMenuDiv', (elem) => {
      elem.style.backgroundColor = '#44cc00'
    })
    SafeGetElementById('infoMainDiv', (elem) => {
      elem.innerText = ''
    })
    SafeGetElementById('loginDiv', (elem) => {
      elem.style.display = 'flex'
    })
    SafeGetElementById('peerSelector', (elem) => {
      elem.style.display = ''
    })
    loggedIn = false
  }

  function addNewHost() {
    SafeGetElementById('buttonContainer', (elem) => {
      elem.style.display = 'none'
    })
    SafeGetElementById('retryContainer', (elem) => {
      elem.style.display = 'none'
    })
    SafeGetElementById('peerSelector', (elem) => {
      elem.style.display = 'none'
    })
    SafeGetElementById('scriptMenuDiv', (elem) => {
      elem.style.backgroundColor = '#262626'
    })
    SafeGetElementById('infoMainDiv', (elem) => {
      elem.innerText = texts.noHostText
    })
    SafeGetElementById('hostInputContainer', (elem) => {
      elem.style.display = 'flex'
    })
    SafeGetElementById('loginDiv', (elem) => {
      elem.style.display = 'none'
    })
  }

  function addHost(val) {
    let isHostValid = false
    let hostUrl = val
    const regex = new RegExp('[a-zA-Z]+(?:\\.[a-zA-Z]+)+')
    if (hostUrl.match(regex) || hostUrl.includes('localhost')) {
      if (hostUrl.includes('://')) {
        hostUrl = hostUrl.split('//')[1]
      }
      if (hostUrl.endsWith('/')) {
        hostUrl = hostUrl.replace(/\//, '')
      }
      isHostValid = true
    }

    if (!isHostValid) {
      SafeGetElementById('infoMainDiv', (elem) => {
        elem.innerText = texts.invalidDomain
      })
      return
    }

    let port = hostUrl.includes('http:') ? 80 : 443
    if (hostUrl.split(':').length > 1) {
      port = hostUrl.split(':')[1]
      port = port.replace(/\//g, '')
      hostUrl = hostUrl.replace(':' + port, '')
    }

    SafeGetElementById('buttonContainer', (elem) => {
      elem.style.display = 'flex'
    })
    SafeGetElementById('hostInputContainer', (elem) => {
      elem.style.display = 'none'
    })

    serverToUse = { host: hostUrl, port: port }
    setJSONVal('serverToUse', serverToUse)
    serverAdress = getPeerUrl(serverToUse)
    apiAdress = getPeerUrl(serverToUse) + 'api/'
    SafeGetElementById('infoMainDiv', (elem) => {
      elem.innerText = texts.connecting + getShortServerURL(serverAdress)
    })
    debugLog({ serverAdress: serverAdress, apiAdress: apiAdress })
    infoExpireTime = 0
    p2pInfoExpireTime = 0
    ConnectToServer()
  }

  // : }}}

  // : UI handling {{{

  function isNewDay() {
    const now = new Date()
    const lastLoad = getVal('lastLoadDate')

    if (new Date(lastLoad).getDay() !== now.getDay()) {
      setVal('lastLoadDate', now.toString())
      return true
    }

    return false
  }

  function shouldShowMotd() {
    if (!emptyOrWhiteSpace(motd)) {
      var prevmotd = getVal('motd')
      if (prevmotd !== motd || isNewDay()) {
        setVal('motdcount', motdShowCount)
        setVal('motd', motd)
        return true
      } else {
        var motdcount = getVal('motdcount')
        if (motdcount === undefined) {
          setVal('motdcount', motdShowCount)
          motdcount = motdShowCount
        }

        motdcount--
        if (motdcount > 0) {
          setVal('motdcount', motdcount)
          return true
        }
      }
    }
  }

  function HandleUI() {
    const newVersion = info().script.version !== getVal('lastVerson')
    const showMOTD = shouldShowMotd()
    const isNewVersionAvaible =
      lastestVersion !== undefined && info().script.version !== lastestVersion

    let timeout = null
    const greetMsg = []

    if (isNewVersionAvaible) {
      // timeout = 5
      // greetMsg.push(texts.newVersionAvaible + lastestVersion)
      // timeout = undefined
    }
    if (newVersion) {
      greetMsg.push(texts.versionUpdated + info().script.version)
      setVal('lastVerson', info().script.version) // setting lastVersion
    }
    if (showMOTD) {
      greetMsg.push(texts.motd + motd)
      timeout = null
    }
    if (greetMsg.length > 0) {
      greetMsg.unshift(texts.scriptName + info().script.version)
    }

    ShowMessage(greetMsg.join('\n'), timeout)
  }

  // : }}}

  // : Answering stuffs {{{

  function PrepareAnswers(result) {
    const { answers, question } = result
    if (answers.length > 0) {
      return answers.map((answer) => {
        const { Q, A, data } = answer.q
        let msg = Q + '\n' + A

        // TODO: show 'képek sorrendben' if there are no new kind of image ids
        if (data.type === 'image') {
          question.images.forEach((img, i) => {
            const regex = new RegExp(`\\[${img.val}\\]`, 'g')
            msg = msg.replace(regex, '[' + i.toString() + ']')
          })
        }

        return {
          m: msg,
          p: answer.match,
          header:
            answer.detailedMatch.matchedSubjName +
            ' - ' +
            answer.detailedMatch.qdb,
        }
      })
    } else {
      return [
        {
          m: 'Erre a kérdésre nincs találat :c',
        },
      ]
    }
  }

  function addImageIdsToImageNodes(imgs) {
    if (!imgs || !Array.isArray(imgs.images)) {
      return
    }

    imgs.images.forEach((img, i) => {
      const text = document.createElement('div')
      text.innerText = `[${i}]`
      SetStyle(text, {
        backgroundColor: '#333',
        borderRadius: '5px',
        color: 'white',
        opacity: 0.7,
        fontSize: '13px',
      })
      appendBelowElement(img.node, text)
    })
  }

  // results = Array<{
  //   answers: Array<{
  //     detailedMatch: {
  //        qMatch: Number,
  //        aMatch: Number,
  //        dMatch: Number,
  //        matchedSubjName: String,
  //        avg: Number
  //     },
  //     match: Number,
  //     q: {
  //        Q: String,
  //        A: String,
  //        cache: {
  //            Q: Array<String>,
  //            A: Array<String>,
  //        },
  //        data: {
  //            type: String,
  //            date: Number
  //            images?: Array<String>
  //        }
  //     }
  //   }>,
  //   question: {
  //     question: String,
  //     success: Boolean,
  //     images: Array<{
  //        val: String,
  //        node: HtmlNode
  //     }>,
  //     data: {
  //        type: String,
  //        date: Number
  //        hashedImages?: Array<String>,
  //        images?: Array<String>
  //     },
  //     possibleAnswers: Array<String>
  //   }
  // }>
  function ShowAnswers(results) {
    log(results)
    try {
      const answers = results.reduce((acc, res) => {
        const prepared = PrepareAnswers(res)
        addImageIdsToImageNodes(res.question)
        if (prepared) {
          acc.push(prepared)
        }
        return acc
      }, [])

      if (answers.length > 0) {
        ShowMessage(answers)
      } else {
        ShowMessage(
          texts.noResult,

          undefined,
          function () {
            OpenErrorPage({
              message: 'No result found',
              question: Array.isArray(answers[0])
                ? answers[0][0].replace(/"/g, '').replace(/:/g, '')
                : answers[0],
            })
          }
        )
      }
    } catch (e) {
      warn('Error showing answers')
      warn(e)
    }
  }

  // : }}}

  // : Quiz saving {{{

  function HandleMoodleResults() {
    getQuiz().then((res) => {
      SaveQuiz(res) // saves the quiz questions and answers
    })
  }

  function ShowSaveQuizDialog(sendResult, sentData, newQuestions) {
    var msg = ''
    if (sendResult) {
      msg = 'Kérdések elküldve, katt az elküldött adatokért.'
      if (newQuestions > 0) {
        msg += ' ' + newQuestions + ' új kérdés'
      } else {
        msg += ' Nincs új kérdés'
      }
    } else {
      msg =
        'Szerver nem elérhető, vagy egyéb hiba kérdések elküldésénél! (F12 -> Console)'
    }
    // showing a message wit the click event, and the generated page
    ShowMessage(
      msg,

      null,
      function () {
        let towrite = ''
        try {
          towrite += '</p>Elküldött adatok:</p> ' + JSON.stringify(sentData)
        } catch (e) {
          towrite += '</p>Elküldött adatok:</p> ' + sentData
        }
        document.write(towrite)
        document.close()
      }
    )
  }

  // saves the current quiz. questionData contains the active subjects questions
  function SaveQuiz(quiz) {
    try {
      let sentData = {}
      if (quiz.length === 0) {
        ShowMessage(texts.noParseableQuestionResult)
        return
      }
      try {
        sentData = {
          version: info().script.version,
          id: getCid(),
          quiz: quiz,
          location: currUrl,
        }
        try {
          sentData.subj = getCurrentSubjectName()
        } catch (e) {
          sentData.subj = 'NOSUBJ'
          warn('unable to get subject name :c')
        }
        log('SENT DATA', sentData)
        post('isAdding', sentData).then((res) => {
          ShowSaveQuizDialog(res.success, sentData, res.totalNewQuestions)
        })
      } catch (e) {
        Exception(e, 'error at sending data to server.')
      }
    } catch (e) {
      Exception(e, 'script error at saving quiz')
    }
  }

  // : }}}

  // : Misc {{{

  // : Version action functions {{{

  function registerScript() {
    try {
      // uncomment to re-register again every page refresh
      // setVal('registeredWithCid', false)
      // setVal('registeredWithUid', false)

      if (getVal('registeredWithCid')) {
        if (getVal('registeredWithUid')) {
          return
        } else if (!getUid()) {
          return
        }
      }

      setVal('registeredWithCid', true)
      if (getUid()) {
        setVal('registeredWithUid', true)
      }

      post('registerscript', {
        cid: getCid(),
        uid: getUid(),
        version: info().script.version,
        date: new Date(),
        installSource: info().script.updateURL,
      })
    } catch (err) {
      warn('Unexpected error while registering script')
      warn(err)
    }
  }

  // : }}}

  // : Video hotkey stuff {{{

  // this function adds basic hotkeys for video controll.
  function AddVideoHotkeys() {
    var seekTime = 20
    document.addEventListener('keydown', function (e) {
      try {
        var video = getVideo()
        var keyCode = e.keyCode // getting keycode
        if (keyCode === 32) {
          // if the keycode is 32 (space)
          e.preventDefault() // preventing default action (space scrolles down)
          if (video.paused && video.buffered.length > 0) {
            video.play()
          } else {
            video.pause()
          }
        }
        if (keyCode === 39) {
          // rigth : 39
          video.currentTime += seekTime
        }
        if (keyCode === 37) {
          // left : 37
          video.currentTime -= seekTime
        }
      } catch (err) {
        warn('Hotkey error.')
        warn(err.message)
      }
    })
    var toadd = getVideoElement()
    var node = CreateNodeWithText(toadd, texts.videoHelp)
    node.style.margin = '5px 5px 5px 5px' // fancy margin
  }

  // : }}}

  // : }}}

  // : }}}

  // : Show message, and script menu stuff {{{

  function clearAllMessages() {
    overlay.querySelectorAll('#scriptMessage').forEach((x) => x.remove())
  }

  function getConvertedMessageNode(message) {
    if (!message) return ''

    const messageNode = document.createElement('p')
    const resultNode = document.createElement('p')
    messageNode.innerHTML = message.replace(/\n/g, '</br>')

    Array.from(messageNode.childNodes).forEach((node) => {
      if (node.tagName === 'A') {
        const linkNode = document.createElement('span')
        SetStyle(linkNode, {
          color: 'lightblue',
          textDecoration: 'underline',
          cursor: 'pointer',
        })
        linkNode.innerText = node.innerText
        linkNode.addEventListener('mousedown', (e) => {
          e.stopPropagation()
          openInTab(node.href, {
            active: true,
          })
        })
        resultNode.appendChild(linkNode)
      } else {
        resultNode.appendChild(node)
      }
    })

    return resultNode
  }

  function addOpacityChangeEvent(elem) {
    if (!elem.id) {
      warn('element must have ID to add opacity change event!')
      return
    }

    let currOpacity = getVal(`${elem.id}_opacity`) || 1
    elem.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault()
        const isUp = e.deltaY < 0
        if (isUp) {
          if (currOpacity + messageOpacityDelta <= 1) {
            currOpacity = currOpacity + messageOpacityDelta
          }
        } else {
          if (currOpacity - messageOpacityDelta > minMessageOpacity) {
            currOpacity = currOpacity - messageOpacityDelta
          }
        }
        elem.style.opacity = currOpacity
        setVal(`${elem.id}_opacity`, currOpacity)
      },
      { capture: true }
    )
  }

  function addMoveEventListener(elem) {
    let isMouseDown = false
    let offset = [0, 0]
    let mousePosition
    elem.addEventListener('mousedown', (e) => {
      isMouseDown = true
      offset = [elem.offsetLeft - e.clientX, elem.offsetTop - e.clientY]
    })
    elem.addEventListener('mouseup', () => {
      isMouseDown = false
    })
    elem.addEventListener('mousemove', (e) => {
      if (isMouseDown) {
        mousePosition = {
          x: e.clientX,
          y: e.clientY,
        }
        elem.style.left = mousePosition.x + offset[0] + 'px'
        elem.style.top = mousePosition.y + offset[1] + 'px'
      }
    })
  }

  function ShowMessage(msgItem, timeout, funct) {
    let isSimpleMessage = false
    let simpleMessageText = ''
    const movingEnabled = !funct
    if (typeof msgItem === 'string') {
      simpleMessageText = msgItem
      if (simpleMessageText === '') {
        // if msg is empty
        return
      }
      msgItem = [
        [
          {
            m: simpleMessageText,
          },
        ],
      ]
      isSimpleMessage = true
    }
    // -------------------------------------------------------------------------
    const id = 'scriptMessage'
    const messageElem = document.createElement('div')
    messageElem.setAttribute('id', id)
    addOpacityChangeEvent(messageElem)
    let width = window.innerWidth - window.innerWidth / 6 // with of the box
    if (width > 900) {
      width = 900
    }
    SetStyle(messageElem, {
      position: 'fixed',
      zIndex: 999999,
      color: '#fff',
      textAlign: 'center',
      border: '2px solid #f2cb05',
      borderRadius: '0px',
      backgroundColor: '#222426',
      top: '30px',
      left: (window.innerWidth - width) / 2 + 'px',
      width: width + 'px',
      opacity: getVal(`${id}_opacity`),
      cursor: funct ? 'pointer' : 'move',
    })
    if (funct) {
      addEventListener(messageElem, 'click', funct)
    }
    if (movingEnabled) {
      addMoveEventListener(messageElem)
    }
    addEventListener(window, 'resize', function () {
      messageElem.style.left = (window.innerWidth - width) / 2 + 'px'
    })

    let timeOut
    if (timeout && timeout > 0) {
      timeOut = setTimeout(function () {
        messageElem.parentNode.removeChild(messageElem)
      }, timeout * 1000)
    }

    addEventListener(messageElem, 'mousedown', function (e) {
      if (e.which === 2) {
        messageElem.parentNode.removeChild(messageElem)
        if (timeOut) {
          clearTimeout(timeOut)
        }
      }
    })

    let currQuestionIndex = 0
    let currPossibleAnswerIndex = 0
    const getCurrMsg = () => {
      return msgItem[currQuestionIndex][currPossibleAnswerIndex]
    }

    // -------------------------------------------------------------------------

    const sidesWidth = '10%'
    const arrowStyle = {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: '22px',
      userSelect: 'none',
      flex: 1,
    }
    const infoTextStyle = {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
    }

    const childrenTree = {
      header: {
        style: {
          display: getCurrMsg().header ? '' : 'none',
          padding: '5px 0px',
        },
      },
      msgContainer: {
        style: {
          display: 'flex',
          width: '100%',
          padding: '5px 0px',
        },
        children: {
          leftSideDiv: {
            style: {
              display: isSimpleMessage ? 'none' : 'flex',
              flexFlow: 'column',
              width: sidesWidth,
            },
            children: {
              questionIndex: {
                title: 'Kérdés sorszáma / talált válasz sorszáma',
                style: infoTextStyle,
              },
              matchPercent: {
                title: 'Talált kérdés egyezés',
                style: infoTextStyle,
              },
              prevPossible: {
                title: 'Előző lehetséges válasz',
                style: Object.assign(
                  {
                    cursor: 'pointer',
                  },
                  arrowStyle
                ),
                innerText: msgItem[currQuestionIndex].length > 1 ? '⬅️' : '',
                onClick: (e) => {
                  e.stopPropagation()
                  if (currPossibleAnswerIndex > 0) {
                    currPossibleAnswerIndex--
                    updateMessageText()
                  }
                },
              },
            },
          },
          msgDiv: {
            style: {
              flex: '1',
              whiteSpace: 'pre-line',
              cursor: funct ? 'pointer' : 'auto',
            },
          },
          rightSideDiv: {
            style: {
              display: isSimpleMessage ? 'none' : 'flex',
              flexFlow: 'column',
              width: sidesWidth,
            },
            children: {
              prevQuestion: {
                title: 'Előző kérdés',
                style: Object.assign(
                  {
                    cursor: msgItem.length > 1 ? 'pointer' : '',
                  },
                  arrowStyle
                ),
                innerText: msgItem.length > 1 ? '⬆️' : '',
                onClick: (e) => {
                  if (msgItem.length > 1) {
                    e.stopPropagation()
                    if (currQuestionIndex > 0) {
                      currQuestionIndex--
                      updateMessageText()
                    }
                  }
                },
              },
              nextQuestion: {
                title: 'Következő kérdés',
                style: Object.assign(
                  {
                    cursor: msgItem.length > 1 ? 'pointer' : '',
                  },
                  arrowStyle
                ),
                innerText: msgItem.length > 1 ? '⬇️' : '',
                onClick: (e) => {
                  if (msgItem.length > 1) {
                    e.stopPropagation()
                    if (currQuestionIndex < msgItem.length - 1) {
                      currQuestionIndex++
                      updateMessageText()
                    }
                  }
                },
              },
              nextPossible: {
                title: 'Következő lehetséges válasz',
                style: Object.assign(
                  {
                    cursor: 'pointer',
                  },
                  arrowStyle
                ),
                innerText: msgItem[currQuestionIndex].length > 1 ? '➡️' : '',
                onClick: (e) => {
                  e.stopPropagation()
                  if (
                    currPossibleAnswerIndex <
                    msgItem[currQuestionIndex].length - 1
                  ) {
                    currPossibleAnswerIndex++
                    updateMessageText()
                  }
                },
              },
            },
          },
        },
      },
    }

    const result = {}
    createHtml(childrenTree, messageElem, result)

    // -------------------------------------------------------------------------

    result.msgContainer.child.msgDiv.elem.addEventListener('mousedown', (e) => {
      e.stopPropagation()
    })

    const updateMessageText = () => {
      try {
        result.header.elem.innerText = getCurrMsg().header
        result.msgContainer.child.msgDiv.elem.innerText = getCurrMsg().m

        if (msgItem.length !== 1 || msgItem[0].length !== 1) {
          result.msgContainer.child.leftSideDiv.child.questionIndex.elem.innerText =
            (currQuestionIndex + 1).toString() +
            './' +
            (currPossibleAnswerIndex + 1) +
            '.'
        }

        result.msgContainer.child.leftSideDiv.child.matchPercent.elem.innerText =
          isNaN(getCurrMsg().p) ? '' : getCurrMsg().p + '%'

        if (isSimpleMessage) {
          result.msgContainer.child.msgDiv.elem.replaceChildren()
          result.msgContainer.child.msgDiv.elem.appendChild(
            getConvertedMessageNode(getCurrMsg().m)
          )
        } else {
          result.msgContainer.child.msgDiv.elem.innerText = getCurrMsg().m
        }
      } catch (e) {
        warn('Error in message updating')
        warn(e)
      }
    }
    updateMessageText()

    // -------------------------------------------------------------------------

    overlay.appendChild(messageElem)

    return {
      messageElement: messageElem,
      removeMessage: () => {
        messageElem.parentNode.removeChild(messageElem)
      },
    }
  }

  // shows a fancy menu
  function ShowMenu() {
    try {
      // Script menu -----------------------------------------------------------------
      const scriptMenuDiv = document.createElement('div')
      const id = 'scriptMenuDiv'
      scriptMenuDiv.setAttribute('id', id)
      SetStyle(scriptMenuDiv, {
        display: 'flex',
        flexDirection: 'column',
        width: '300px',
        height: '110px',
        position: 'fixed',
        padding: '3px 0px',
        bottom: '10px',
        left: '10px',
        zIndex: 999999,
        border: '2px solid #f2cb05',
        borderRadius: '0px',
        backgroundColor: '#222426',
        opacity: getVal(`${id}_opacity`),
        fontSize: '14px',
      })

      addEventListener(scriptMenuDiv, 'mousedown', function (e) {
        if (e.which === 2) {
          scriptMenuDiv.parentNode.removeChild(scriptMenuDiv)
        }
      })
      addOpacityChangeEvent(scriptMenuDiv)

      const buttonStyle = {
        position: '',
        margin: '3px',
        padding: '4px 8px',
        border: '1px solid #333',
        borderRadius: '2px',
        color: '#ffffff',
        cursor: 'pointer',
      }

      // -----------------------------------------------------------------------------

      const childrenTree = {
        xButton: {
          innerText: '❌',
          style: {
            position: 'absolute',
            display: 'inline',
            right: '0px',
            top: '0px',
            margin: '5px',
            cursor: 'pointer',
            fontSize: '18px',
          },
          onClick: () => {
            scriptMenuDiv.parentNode.removeChild(scriptMenuDiv)
          },
        },
        buttonContainer: {
          id: 'buttonContainer',
          style: {
            display: 'flex',
            justifyContent: 'center',
          },
          children: {
            website: {
              innerText: 'Weboldal',
              style: buttonStyle,
              onClick: () => {
                openInTab(serverAdress + '?menuClick')
              },
            },
            help: {
              innerText: 'Help',
              style: buttonStyle,
              onClick: () => {
                ShowHelp()
              },
            },
            donate: {
              innerText: 'Donate',
              style: buttonStyle,
              onClick: () => {
                openInTab(serverAdress + '?donate=true&scriptMenu=true', {
                  active: true,
                })
              },
            },
            aiSettings: {
              innerText: 'AI Settings',
              style: buttonStyle,
              onClick: () => {
                // Create model selection options
                const modelOptions = Object.entries(OPENAI_MODELS)
                  .map(([id, info]) => `${id}: ${info.name} (${info.cost} cost)`)
                  .join('\n');

                // Prompt for API key
                const key = prompt('Enter your OpenAI API key:\n(Current: ' + (OPENAI_API_KEY || 'Not set') + ')', OPENAI_API_KEY || '');
                if (key !== null) {
                  setVal('openaiApiKey', key.trim());
                
                  // Prompt for model selection
                  const model = prompt(
                    'Select AI Model (enter the model name):\n\nAvailable models:\n' + modelOptions + '\n\nCurrent: ' + OPENAI_MODEL,
                    OPENAI_MODEL
                  );
                  
                  if (model && OPENAI_MODELS[model]) {
                    setVal('openaiModel', model);
                    ShowMessage('AI settings saved. Using ' + OPENAI_MODELS[model].name);
                  } else if (model) {
                    ShowMessage('Invalid model selected. Using ' + OPENAI_MODELS[OPENAI_MODEL].name);
                  }
                }
              },
            },
          },
        },
        statusContainer: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            margin: '0px 10px',
          },
          children: {
            infoContainer: {
              id: 'infoMainDiv',
              innerText: texts.connecting + getShortServerURL(serverAdress),
              style: {
                color: '#ffffff',
                textAlign: 'center',
              },
            },
            loginContainer: {
              id: 'loginDiv',
              style: {
                display: 'none',
              },
              children: {
                loginInput: {
                  customElem: () => {
                    const loginInput = document.createElement('input')
                    loginInput.setAttribute('id', 'pwInput')
                    loginInput.type = 'text'
                    loginInput.placeholder = texts.pwHere
                    SetStyle(loginInput, {
                      width: '100%',
                      textAlign: 'center',
                    })
                    return loginInput
                  },
                },
                loginButton: {
                  innerText: texts.login,
                  style: buttonStyle,
                  onClick: () => {
                    SafeGetElementById('pwInput', (elem) => {
                      Auth(elem.value.trim())
                    })
                  },
                },
              },
            },
            peerSelector: {
              customElem: () => {
                try {
                  const peerSelector = document.createElement('select')
                  peerSelector.setAttribute('id', 'peerSelector')
                  SetStyle(peerSelector, {
                    width: '100%',
                    textAlign: 'center',
                    backgroundColor: '#262626',
                    color: 'white',
                    border: '1px solid #f2cb05',
                    cursor: 'pointer',
                    margin: '4px 0px',
                  })

                  updatePeerSelector(peerSelector)

                  return peerSelector
                } catch (e) {
                  return document.createElement('span')
                }
              },
            },
            hostInputContainer: {
              id: 'hostInputContainer',
              style: {
                display: 'none',
              },
              children: {
                peerInput: {
                  customElem: () => {
                    const peerInput = document.createElement('input')
                    peerInput.setAttribute('id', 'peerInput')
                    peerInput.type = 'text'
                    peerInput.placeholder = texts.hostHere
                    SetStyle(peerInput, {
                      width: '100%',
                      textAlign: 'center',
                    })
                    return peerInput
                  },
                },
                backButton: {
                  innerText: texts.back,
                  style: {
                    color: 'white',
                    position: 'absolute',
                    display: serverToUse ? 'inline' : 'none',
                    right: '0px',
                    bottom: '0px',
                    margin: '5px',
                    cursor: 'pointer',
                  },
                  onClick: () => {
                    resetMenu()
                    SafeGetElementById('peerSelector', (elem) => {
                      elem.style.display = ''
                      updatePeerSelector(elem)
                    })
                    SafeGetElementById('infoMainDiv', (elem) => {
                      if (subjInfo) {
                        elem.innerText = `${subjInfo.subjects.toLocaleString()} tárgy, ${subjInfo.questions.toLocaleString()} kérdés`
                      }
                    })
                    if (!loggedIn) {
                      NoUserAction()
                    }
                  },
                },
                connectButton: {
                  innerText: texts.connect,
                  style: buttonStyle,
                  onClick: () => {
                    SafeGetElementById('peerInput', (elem) => {
                      addHost(elem.value)
                    })
                  },
                },
              },
            },
            retryContainer: {
              id: 'retryContainer',
              style: {
                display: 'none',
                justifyContent: 'center',
              },
              children: {
                retryButton: {
                  innerText: texts.retry,
                  style: {
                    position: '',
                    padding: '0px 8px',
                    margin: '0px 4px',
                    border: '1px solid #333',
                    borderRadius: '2px',
                    color: '#ffffff',
                    cursor: 'pointer',
                  },
                  onClick: () => {
                    scriptMenuDiv.style.background = '#262626'
                    SafeGetElementById('infoMainDiv', (elem) => {
                      elem.innerText =
                        texts.connecting + getShortServerURL(serverAdress)
                    })
                    SafeGetElementById('retryContainer', (elem) => {
                      elem.style.display = 'none'
                    })
                    ConnectToServer()
                  },
                },
                anotherPeerButton: {
                  innerText: texts.selectOtherPeer,
                  style: {
                    position: '',
                    padding: '0px 8px',
                    margin: '0px 4px',
                    border: '1px solid #333',
                    borderRadius: '2px',
                    color: '#ffffff',
                    cursor: 'pointer',
                  },
                  onClick: () => {
                    addNewHost()
                  },
                },
              },
            },
          },
        },
      }

      const result = {}
      createHtml(childrenTree, scriptMenuDiv, result)
      overlay.appendChild(scriptMenuDiv)
    } catch (e) {
      Exception(e, 'script error at showing menu:')
    }
  }

  function onPeerSelect(e) {
    const peers = getJSONVal('peers') || []
    const selectedValue = e.target.value
    if (selectedValue === 'new') {
      addNewHost()
    } else {
      skipAvailablePeerFind = true
      const selectedPeer = peers[selectedValue]
      if (!selectedPeer) {
        return
      }
      connectToPeer(selectedPeer)
    }
  }

  function updatePeerSelector(selector) {
    try {
      const peerSelector = document.getElementById('peerSelector') || selector
      if (!peerSelector) return
      const peers = getJSONVal('peers') || []

      peerSelector.length = 0
      peers.forEach((peer, i) => {
        const option = document.createElement('option')
        option.innerText = getPeerUrl(peer, true)
        option.value = i

        peerSelector.appendChild(option)
      })
      const newPeerOption = document.createElement('option')
      newPeerOption.innerText = texts.addNewPeer
      newPeerOption.value = 'new'
      peerSelector.appendChild(newPeerOption)

      peerSelector.removeEventListener('change', onPeerSelect)
      peerSelector.addEventListener('change', onPeerSelect)

      const selectedPeer = getJSONVal('serverToUse')
      const selectedIndex = peers.findIndex((x) => {
        return getPeerUrl(x) === getPeerUrl(selectedPeer)
      })
      peerSelector.value = selectedIndex
    } catch (e) {
      debugLog('error in updatePeerSelector')
    }
  }

  // : }}}

  // : Generic utils {{{

  // : String utils 2 {{{

  function removeUnnecesarySpaces(toremove) {
    if (!toremove) {
      return ''
    }

    toremove = normalizeSpaces(toremove).replace(/\t/g, '')
    while (toremove.includes('  ')) {
      toremove = toremove.replace(/ {2}/g, ' ')
    }
    while (toremove.includes('\n\n')) {
      toremove = toremove.replace(/\n{2}/g, ' ')
    }
    return toremove.trim()
  }

  function normalizeSpaces(input) {
    assert(input)

    return input.replace(/\s/g, ' ')
  }

  function emptyOrWhiteSpace(value) {
    if (value === undefined) {
      return true
    }

    return (
      value
        .replace(/\s/g, '')
        .replace(/\t/g, '')
        .replace(/ /g, '')
        .replace(/\n/g, ' ') === ''
    )
  }

  // : }}}

  const assert = (val) => {
    if (!val) {
      throw new Error('Assertion failed')
    }
  }

  function logHelper(logMethod, style, ...value) {
    if (logEnabled) {
      logMethod('%c[Moodle Script]:', style, ...value)
    }
  }

  function warn(value) {
    logHelper(console.warn, 'color:yellow', value)
  }

  function log() {
    logHelper(console.log, 'color:green', ...arguments)
  }

  function debugLog() {
    if (isDevel) {
      logHelper(console.log, 'color:grey', ...arguments)
    }
  }

  function Exception(e, msg) {
    log('------------------------------------------')
    log(msg)
    log(e.message)
    log('------------------------------------------')
    log(e.stack)
    log('------------------------------------------')
  }

  function getShortServerURL(url) {
    if (!url) return
    const maxlegnth = 30
    const shortUrl = url.replace('https://', '').replace('http://', '')
    if (shortUrl.length <= maxlegnth) {
      return shortUrl
    } else {
      return shortUrl.substring(0, maxlegnth - 3) + '...'
    }
  }

  function getPeerUrl(peer, forDisplay) {
    if (!peer) return
    if (forDisplay) {
      return peer.host + ':' + peer.port
    }
    let protocol = 'https://'
    if (isDevel) {
      protocol = 'http://'
    }
    return protocol + peer.host + ':' + peer.port + '/'
  }

  function getUid() {
    return getVal('userId')
  }

  function getCid() {
    let currId = getVal('clientId')
    if (currId) {
      return currId
    } else {
      currId = new Date()
      currId = currId.getTime() + Math.floor(Math.random() * 1000000000000)
      currId = currId.toString().split('')
      currId.shift()
      currId = '0' + currId.join('')
      setVal('clientId', currId)
      return currId
    }
  }

  function SafeGetElementById(id, next) {
    const element = overlay.querySelector('#' + id)
    if (element) {
      next(element)
    }
  }

  function SetStyle(target, style) {
    Object.keys(style)
      .sort()
      .forEach((key) => {
        target.style[key] = style[key]
      })
  }

  function createHtml(children, appendTo, result) {
    try {
      Object.keys(children).forEach((key) => {
        const currElem = children[key]
        const elem = currElem.customElem
          ? currElem.customElem()
          : document.createElement('div')
        appendTo.appendChild(elem)
        result[key] = {
          elem: elem,
          child: {},
        }

        if (!currElem.customElem) {
          if (currElem.id) {
            elem.setAttribute('id', currElem.id)
          }
          if (currElem.title) {
            elem.title = currElem.title
          }
          if (currElem.innerText) {
            elem.innerText = currElem.innerText
          }
          if (currElem.onClick) {
            elem.addEventListener('mousedown', (e) => {
              currElem.onClick(e)
            })
          }
          if (currElem.style) {
            SetStyle(elem, currElem.style)
          }
        }

        if (currElem.children) {
          createHtml(currElem.children, elem, result[key].child)
        }
      })
    } catch (e) {
      warn('Error in createHtml')
      warn(e)
    }
  }

  function CreateNodeWithText(to, text, type) {
    var paragraphElement = document.createElement(type || 'p') // new paragraph
    var textNode = document.createTextNode(text)
    paragraphElement.appendChild(textNode)
    if (to) {
      to.appendChild(paragraphElement)
    }
    return paragraphElement
  }

  function GetXHRInfos() {
    const now = new Date().getTime()
    let lastCheck = getVal('lastInfoCheckTime')
    if (!lastCheck) {
      setVal('lastInfoCheckTime', 0)
      lastCheck = 0
    }

    let lastInfo = { result: 'noLastInfo' }

    if (now > lastCheck + infoExpireTime * 1000) {
      return new Promise((resolve, reject) => {
        const url =
          apiAdress +
          'infos?version=true&motd=true&subjinfo=true&cversion=' +
          info().script.version +
          '&cid=' +
          getCid()

        get(url)
          .then(({ responseText }) => {
            try {
              const infos = JSON.parse(responseText)
              setJSONVal('lastInfo', infos)
              setVal('lastInfoCheckTime', now)
              resolve(infos)
            } catch (e) {
              log('Error parsing JSON in GetXHRInfos')
              log({ infos: responseText })
              log(e)
              reject(e)
            }
          })
          .catch((e) => {
            log('Info get Error', e)
            reject(e)
          })
      })
    } else {
      return new Promise((resolve, reject) => {
        try {
          lastInfo = JSON.parse(getVal('lastInfo'))
          resolve(lastInfo)
        } catch (e) {
          log('Error parsing JSON in GetXHRInfos, when using old data!')
          log(e)
          reject(e)
        }
      })
    }
  }

  function updateP2pData(newData) {
    const peers = getJSONVal('peers')
    const oldPeers = peers || []
    const merged = newData.reduce((acc, peer) => {
      const peerAlreadyExists = acc.find((existingPeer) => {
        const p1 = peer.host + ':' + peer.port
        const p2 = existingPeer.host + ':' + existingPeer.port
        return p1 === p2
      })

      if (!peerAlreadyExists) {
        peer.added = new Date().getTime()
        return [peer, ...acc]
      }

      return acc
    }, oldPeers)
    return merged
  }

  function getPeers() {
    const now = new Date().getTime()
    let lastCheck = getVal('lastp2pchecktime')
    if (!lastCheck) {
      setVal('lastp2pchecktime', 0)
      lastCheck = 0
    }

    if (now > lastCheck + p2pInfoExpireTime * 1000) {
      return new Promise((resolve, reject) => {
        const url = apiAdress + 'p2pinfo'

        get(url)
          .then(({ responseText: p2pinfo }) => {
            try {
              const p2pinfoObj = updateP2pData(JSON.parse(p2pinfo).myPeers)
              setJSONVal('peers', p2pinfoObj)
              setVal('lastp2pchecktime', now)
              resolve(p2pinfoObj)
            } catch (e) {
              log('Error parsing JSON in getPeers')
              log(p2pinfo)
              log(e)
              reject(e)
            }
          })
          .catch((e) => {
            log('Peer get Error', e)
            reject(e)
          })
      })
    } else {
      return new Promise((resolve, reject) => {
        try {
          resolve(getJSONVal('peers'))
        } catch (e) {
          log('Error parsing JSON in getPeers, when using old data!')
          log(e)
          reject(e)
        }
      })
    }
  }

  function head(url) {
    return new Promise((resolve, reject) => {
      xmlhttpRequest({
        method: 'HEAD',
        url: url,
        crossDomain: true,
        timeout: 5 * 1000,
        ontimeout: () => {
          reject(new Error('HEAD request timed out'))
        },
        onload: function (response) {
          resolve(response)
        },
        onerror: (e) => {
          reject(e)
        },
      })
    })
  }

  function get(url) {
    return new Promise((resolve, reject) => {
      xmlhttpRequest({
        method: 'GET',
        url: url,
        crossDomain: true,
        timeout: 15 * 1000,
        ontimeout: () => {
          reject(new Error('GET request timed out'))
        },
        xhrFields: { withCredentials: true },
        headers: {
          'Content-Type': 'application/json',
        },
        onload: function (response) {
          resolve(response)
        },
        onerror: (e) => {
          reject(e)
        },
      })
    })
  }

  // Make a request to the AI model using GM_xmlhttpRequest
  async function askGPT4(question) {
    if (!OPENAI_API_KEY) {
      warn('API key not set. Set it using GM_setValue("openaiApiKey", "your-key")')
      return null
    }

    const systemPrompt = `You are an expert AI assistant helping with academic questions. Your task is to:
1. Answer the given question accurately and concisely
2. Always structure your response in a clear format
3. Your response should be formatted as follows:
   [Your detailed answer]
   
   {
     "answer": "[concise answer suitable for multiple choice]"
   }
4. Be direct and professional
5. Do not use phrases like "I think" or "In my opinion"
6. Format mathematical equations without LaTeX, using plain text notation`

    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: OPENAI_API_ENDPOINT,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        data: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Please answer the question: "${question}"` }
          ],
         
          // Request JSON format from the model
          response_format: { type: "text" },
        }),
        onload: function(response) {
          try {
            const result = JSON.parse(response.responseText);
            if (result.error) {
              warn('AI API Error:', result.error);
              reject(result.error);
              return;
            }
            
            // Extract answer from the response
            let answer = result.choices[0].message.content;
            
            // Try to extract the JSON answer part
            try {
              const jsonMatch = answer.match(/{[\s\S]*}/);
              if (jsonMatch) {
                const jsonAnswer = JSON.parse(jsonMatch[0]);
                if (jsonAnswer.answer) {
                  answer = jsonAnswer.answer;
                }
              }
            } catch (e) {
              warn('Error parsing JSON from answer, using full response');
            }
            
            resolve(answer);
          } catch (error) {
            warn('Error parsing AI response:', error);
            reject(error);
          }
        },
        onerror: function(error) {
          warn('Error making AI request:', error);
          reject(error);
        }
      });
    });
  }

  function post(path, message) {
    if (typeof message === 'object') {
      message = JSON.stringify(message)
    }
    const url = apiAdress + path
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: url,
        timeout: 30 * 1000,
        data: message,
        headers: {
          'Content-Type': 'application/json',
        },
        onerror: function (e) {
          log('Data send error', e)
          reject(e)
        },
        onload: (resp) => {
          try {
            const res = JSON.parse(resp.responseText)
            resolve(res)
          } catch (e) {
            log('Error parsing JSON in post')
            log(resp.responseText)
            log(e)
            reject(e)
          }
        },
        ontimeout: () => {
          reject(new Error('POST request timed out'))
        }
      })
    })
  }

  function OpenErrorPage(e) {
    const queries = []
    try {
      Object.keys(e).forEach((key) => {
        if (e[key]) {
          queries.push(`${key}=${encodeURIComponent(e[key])}`)
          queries.push('db=all')
        }
      })
      queries.push('version=' + encodeURIComponent(info().script.version))
      queries.push('uid=' + encodeURIComponent(getUid()))
      queries.push('cid=' + encodeURIComponent(getCid()))
    } catch (e) {
      Exception(e, 'error at setting error stack/msg link')
    }
    openInTab(serverAdress + 'lred?' + queries.join('&'), {
      active: true,
    })
  }

  // : }}}

  // : Help {{{

  // shows some neat help
  function ShowHelp() {
    openInTab(serverAdress + 'faq', {
      active: true,
    })
  }

  // : }}}

  // I am not too proud to cry that He and he
  // Will never never go out of my mind.
  // All his bones crying, and poor in all but pain,

  // Being innocent, he dreaded that he died
  // Hating his God, but what he was was plain:
  // An old kind man brave in his burning pride.

  // The sticks of the house were his; his books he owned.
  // Even as a baby he had never cried;
  // Nor did he now, save to his secret wound.

  // Out of his eyes I saw the last light glide.
  // Here among the liught of the lording sky
  // An old man is with me where I go

  // Walking in the meadows of his son's eye
  // Too proud to cry, too frail to check the tears,
  // And caught between two nights, blindness and death.

  // O deepest wound of all that he should die
  // On that darkest day.
})() // eslint-disable-line
