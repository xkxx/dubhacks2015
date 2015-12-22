import redis

pool_ho = redis.ConnectionPool(host='localhost', port=6379, db=3)
redis_ho = redis.Redis(connection_pool=pool_ho)

redis_ho.zadd('Dear', 30.0, "('...,')", 20.0, "('Professor')", 10.0, "('Miss')")
redis_ho.zadd('Hello', 30, "('...,')")
redis_ho.zadd('Thank you', 3.0, "('in advance')", 20.0, "('for your help')", 10.0, "('very much')")
redis_ho.zadd('take', 30.0, "('care')", 20.0, "('... into account')")
