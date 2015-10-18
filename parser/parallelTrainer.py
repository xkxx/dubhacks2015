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

pool_ngram = redis.ConnectionPool(host='localhost', port=6379, db=2)
pool_ho = redis.ConnectionPool(host='localhost', port=6379, db=2)

def everygrams(tokens):
    retlist = list()
    for i in range(2, N):
        generated_ngram = list(ngrams(tokens, i))
        retlist.extend(generated_ngram)
    return retlist

def ngramWorker(i, sentences):
    redis_ngram = redis.Redis(connection_pool=pool_ngram)
    workset = sentences[i * (len(sentences) / THREAD_NUM):
        (i + 1) * (len(sentences) / THREAD_NUM)]
    for sentence in workset:
        tokens = nltk.word_tokenize(sentence)
        pattern = re.compile(REGEX)
        validWords = [token for token in tokens if not pattern.match(token)]
        everygram = everygrams(validWords)
        for gram in everygram:
            redis_ngram.incr(gram)

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

# scanForCommonGramsAndBuildHintOptionsStructure
def incrHintOptionWorker(i, grams):
    redis_ho = redis.Redis(connection_pool=pool_ho)
    redis_ngram = redis.Redis(connection_pool=pool_ngram)
    size = len(grams)
    for gram in grams[i * (size / THREAD_NUM): (i + 1) * (size / THREAD_NUM)]:
        freq = redis_ngram.get(gram)
        if freq >= FREQUENCY_THRESHOLD:
            # save hint -> option pair to redis
            wordList = ast.literal_eval(gram)
            hint = wordList[0]
            options = wordList[1:]
            redis_ho.zincrby(hint, options, 1)

def trainModel():
    redis_ngram = redis.Redis(connection_pool=pool_ngram)
    grams = [gram for gram in redis_ngram.scan_iter()]
    threads = []
    for i in range(THREAD_NUM):
        t = threading.Thread(target=incrHintOptionWorker, args=(i, grams))
        threads.append(t)

def userCustomize(hint, options):
    redis_ho = redis.Redis(connection_pool=pool_ho)
    redis_ho.zincrby(hint, options, 3)

buildNGram()
trainModel()
