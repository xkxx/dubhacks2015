from nltk.util import ngrams
import nltk
from os import listdir
import re
import redis
import ast
import threading

N = 4  # ngram from 2 to (N - 1)
DATA_DIR = 'testdataset/'
REGEX = "^[(0-9)\W]+|com|http$"
FREQUENCY_THRESHOLD = 2
THREAD_NUM = 8

NGram = list()

pool = redis.ConnectionPool(host='localhost', port=6379, db=2)

redis_ho = redis.StrictRedis(host='localhost', port=6379, db=3)

def everygrams(tokens):
    retlist = list()
    for i in range(2, N):
        generated_ngram = list(ngrams(tokens, i))
        retlist.extend(generated_ngram)
    return retlist

def ngramWorker(i, sentences):
    workset = sentences[i * (len(sentences) / THREAD_NUM):
        (i + 1) * (len(sentences) / THREAD_NUM)]
    for sentence in workset:
        tokens = nltk.word_tokenize(sentence)
        pattern = re.compile(REGEX)
        validWords = [token for token in tokens if not pattern.match(token)]
        NGram.extend(everygrams(validWords))

def buildNGram():
    files = [open(DATA_DIR + filename).read()
        for filename in listdir(DATA_DIR)]

    sentences = list()
    for lines in [file.split('\n') for file in files]:
        for line in lines:
            lineTokens = line.split('\t')
            if len(lineTokens) > 1:
                sentences.append(lineTokens[1])

    threads = []
    for i in range(THREAD_NUM):
        t = threading.Thread(target=ngramWorker, args=(i, sentences))
        threads.append(t)
        t.start()

def getNGram():
    return NGram

def countingWorker(i):
    redis_ngram = redis.Redis(connection_pool=pool)
    size = len(NGram)
    for gram in NGram[i * (size / THREAD_NUM): (i + 1) * (size / THREAD_NUM)]:
        redis_ngram.incr(NGram)

def serializeNGram():
    threads = []
    for i in range(THREAD_NUM):
        t = threading.Thread(target=countingWorker, args=(i,))
        threads.append(t)
        t.start()

def incrHintOptions(oldcursor):
    redis_ngram = redis.Redis(connection_pool=pool)
    cursor, gramPage = redis_ngram.scan(oldcursor)
    for gram in gramPage:
        freq = redis_ngram.get(gram)
        if freq >= FREQUENCY_THRESHOLD:
            # save hint -> option pair to redis
            wordList = ast.literal_eval(gram)
            hint = wordList[0]
            options = wordList[1:]
            redis_ho.zincrby(hint, options, 1)
    return cursor

# scanForCommonGramsAndBuildHintOptionsStructure
def trainModel():
    cursor = incrHintOptions(0)
    while cursor != "0":
        incrHintOptions(cursor)

def userCustomize(hint, options):
    redis_ho.zincrby(hint, options, 1)

buildNGram()
serializeNGram()
trainModel()
