# コース設定

CHECK_POINT_NUM = 10
TABLE_NUM = 4

"""
table_id = 1のとき、
cp_bef_table[table_id]
↓
table_id
↓
cp_aft_table[table_id]
というサブの道がある。
"""

cp_bef_table = [
    2,
    4,
    6,
    8
]

cp_aft_table = [
    3,
    5,
    7,
    9
]

def get_path(table_id):
    course = range(0, CHECK_POINT_NUM)

    path = (
        list(course[0:cp_bef_table[table_id]]) +
        [CHECK_POINT_NUM + table_id] +
        list(course[cp_aft_table[table_id]:CHECK_POINT_NUM])
    )

    return path